import { WorkflowDomainError } from '../../../src/features/workflow-v2/domain/errors';
import { workflowDefinitionSchema } from '../../../src/features/workflow-v2/domain/schemas';
import type { WorkflowDefinitionDTO } from '../../../src/features/workflow-v2/domain/types';
import { fromStoredJson, runInTransaction, toStoredJson } from './sqlite';
import type { SqliteDatabase } from './sqlite';

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  latest_revision: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RevisionRow {
  workflow_id: string;
  revision: number;
  definition_json: string;
  created_at: string;
  created_by: string;
}

export interface PersistedWorkflowRevision {
  workflowId: string;
  revision: number;
  definition: WorkflowDefinitionDTO;
  createdAt: string;
  createdBy: string;
}

export interface PersistedWorkflow {
  id: string;
  name: string;
  description: string;
  latestRevision: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function cloneDefinition(definition: WorkflowDefinitionDTO): WorkflowDefinitionDTO {
  return structuredClone(definition);
}

function parseDefinition(value: string): WorkflowDefinitionDTO {
  const parsed = workflowDefinitionSchema.safeParse(fromStoredJson(value, null));
  if (!parsed.success) {
    throw new WorkflowDomainError('INVALID_WORKFLOW', 'Persisted workflow revision is invalid', {
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

function toWorkflow(row: WorkflowRow): PersistedWorkflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    latestRevision: row.latest_revision,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRevision(row: RevisionRow): PersistedWorkflowRevision {
  const definition = parseDefinition(row.definition_json);
  if (definition.id !== row.workflow_id || definition.revision !== row.revision) {
    throw new WorkflowDomainError('INVALID_WORKFLOW', 'Persisted revision identity does not match its definition', {
      workflowId: row.workflow_id,
      revision: row.revision,
    });
  }
  return {
    workflowId: row.workflow_id,
    revision: row.revision,
    definition: cloneDefinition(definition),
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export class WorkflowRepository {
  constructor(private readonly database: SqliteDatabase) {}

  createWorkflow(
    definition: WorkflowDefinitionDTO,
    options: { description?: string; createdBy?: string } = {},
  ): PersistedWorkflowRevision {
    const parsed = workflowDefinitionSchema.parse(definition) as WorkflowDefinitionDTO;
    return runInTransaction(this.database, () => {
      const existing = this.database.prepare('SELECT id FROM workflows_v2 WHERE id = ?').get(parsed.id);
      if (existing) {
        throw new WorkflowDomainError('REVISION_CONFLICT', `Workflow ${parsed.id} already exists`, {
          workflowId: parsed.id,
        });
      }
      if (parsed.revision !== 1) {
        throw new WorkflowDomainError('REVISION_CONFLICT', 'The first workflow revision must be 1', {
          workflowId: parsed.id,
          revision: parsed.revision,
        });
      }
      this.database.prepare(`
        INSERT INTO workflows_v2 (id, name, description, latest_revision)
        VALUES (?, ?, ?, ?)
      `).run(parsed.id, parsed.name, options.description ?? '', parsed.revision);
      this.insertRevision(parsed, options.createdBy ?? '');
      return this.requireRevision(parsed.id, parsed.revision);
    });
  }

  createRevision(
    definition: WorkflowDefinitionDTO,
    options: { createdBy?: string } = {},
  ): PersistedWorkflowRevision {
    const parsed = workflowDefinitionSchema.parse(definition) as WorkflowDefinitionDTO;
    return runInTransaction(this.database, () => {
      const workflow = this.database.prepare('SELECT * FROM workflows_v2 WHERE id = ?').get<WorkflowRow>(parsed.id);
      if (!workflow) {
        throw new WorkflowDomainError('REVISION_NOT_FOUND', `Workflow ${parsed.id} does not exist`, {
          workflowId: parsed.id,
        });
      }
      const expectedRevision = workflow.latest_revision + 1;
      if (parsed.revision !== expectedRevision) {
        throw new WorkflowDomainError(
          'REVISION_CONFLICT',
          `Expected revision ${expectedRevision}, received ${parsed.revision}`,
          { workflowId: parsed.id, expectedRevision, revision: parsed.revision },
        );
      }
      this.insertRevision(parsed, options.createdBy ?? '');
      this.database.prepare(`
        UPDATE workflows_v2
        SET latest_revision = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(parsed.revision, parsed.id);
      return this.requireRevision(parsed.id, parsed.revision);
    });
  }

  getWorkflow(workflowId: string): PersistedWorkflow | undefined {
    const row = this.database.prepare('SELECT * FROM workflows_v2 WHERE id = ?').get<WorkflowRow>(workflowId);
    return row ? toWorkflow(row) : undefined;
  }

  listWorkflows(): PersistedWorkflow[] {
    const rows = this.database.prepare('SELECT * FROM workflows_v2 ORDER BY updated_at DESC').all<WorkflowRow>();
    return rows.map(toWorkflow);
  }

  getRevision(workflowId: string, revision?: number): PersistedWorkflowRevision | undefined {
    const row = revision === undefined
      ? this.database.prepare(`
          SELECT r.*
          FROM workflow_v2_revisions r
          JOIN workflows_v2 w ON w.id = r.workflow_id AND w.latest_revision = r.revision
          WHERE r.workflow_id = ?
        `).get<RevisionRow>(workflowId)
      : this.database.prepare(`
          SELECT * FROM workflow_v2_revisions
          WHERE workflow_id = ? AND revision = ?
        `).get<RevisionRow>(workflowId, revision);
    return row ? toRevision(row) : undefined;
  }

  requireRevision(workflowId: string, revision?: number): PersistedWorkflowRevision {
    const persisted = this.getRevision(workflowId, revision);
    if (!persisted) {
      throw new WorkflowDomainError('REVISION_NOT_FOUND', 'Workflow revision was not found', {
        workflowId,
        revision,
      });
    }
    return persisted;
  }

  listRevisions(workflowId: string): PersistedWorkflowRevision[] {
    const rows = this.database.prepare(`
      SELECT * FROM workflow_v2_revisions
      WHERE workflow_id = ?
      ORDER BY revision DESC
    `).all<RevisionRow>(workflowId);
    return rows.map(toRevision);
  }

  private insertRevision(definition: WorkflowDefinitionDTO, createdBy: string): void {
    this.database.prepare(`
      INSERT INTO workflow_v2_revisions
        (workflow_id, revision, definition_json, created_by)
      VALUES (?, ?, ?, ?)
    `).run(definition.id, definition.revision, toStoredJson(definition), createdBy);
  }
}
