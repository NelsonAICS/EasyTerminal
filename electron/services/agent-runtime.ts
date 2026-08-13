import type { CapabilityRegistry } from './capability-registry';
import { runReActLoop, type ReActTool } from './react-engine';
import type { LLMConfig } from './llm-gateway';
import type { ContextPacket } from './context-orchestrator';

interface AgentRuntimeDependencies {
  getLLMConfig: (providerId?: string, model?: string) => LLMConfig | null;
  buildContextPacket: (options?: { query?: string; sessionId?: string; taskId?: string }) => Promise<ContextPacket>;
  capabilityRegistry: CapabilityRegistry;
  readFile: (filePath: string) => Promise<string>;
  runCommand: (command: string) => Promise<string>;
  sendStreamEvent?: (event: { type: string; content: string; tool?: string; args?: unknown }) => void;
}

const DEFAULT_CAPABILITY_TOOL_IDS = [
  'prompt.search',
  'prompt.render',
  'prompt.optimize',
  'skill.search',
  'skill.get',
  'workflow.search',
  'workflow.get',
  'workflow.execute',
  'knowledge.search',
  'context.list',
  'context.records',
  'context.snapshots',
  'context.session_events',
  'context.capture',
  'ui.present_result',
  'ui.show_context_snapshot',
];

function capabilityIdToToolName(capabilityId: string) {
  return capabilityId.replace(/[^\w]/g, '_');
}

function formatContextPacket(packet: ContextPacket) {
  return [
    packet.anchorBlock ? `Anchor Context:\n${packet.anchorBlock}` : '',
    packet.workingBlock ? `Working Memory:\n${packet.workingBlock}` : '',
    packet.episodicBlock ? `Episodic Memory:\n${packet.episodicBlock}` : '',
    packet.retrievalBlock ? `Retrieved Evidence:\n${packet.retrievalBlock}` : '',
    packet.styleBlock ? `Style Guidance:\n${packet.styleBlock}` : '',
    packet.refs.length ? `Context Refs:\n${packet.refs.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

export class AgentRuntime {
  private readonly deps: AgentRuntimeDependencies;

  constructor(deps: AgentRuntimeDependencies) {
    this.deps = deps;
  }

  async run(query: string, toolNames?: string[], options?: { providerId?: string; model?: string; sessionId?: string; taskId?: string }) {
    const llmConfig = this.deps.getLLMConfig(options?.providerId, options?.model);
    if (!llmConfig) throw new Error('No reasoning model configured');

    const contextPacket = await this.deps.buildContextPacket({
      query,
      sessionId: options?.sessionId,
      taskId: options?.taskId,
    });
    const context = formatContextPacket(contextPacket);

    const capabilityTools = DEFAULT_CAPABILITY_TOOL_IDS
      .map(capabilityId => this.deps.capabilityRegistry.get(capabilityId))
      .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition))
      .map(definition => {
        const toolName = capabilityIdToToolName(definition.id);
        return {
          capabilityId: definition.id,
          tool: {
            type: 'function' as const,
            function: {
              name: toolName,
              description: definition.description,
              parameters: definition.inputSchema,
            },
            execute: async (args: Record<string, unknown>) => {
              const result = await this.deps.capabilityRegistry.invoke(definition.id, args);
              return JSON.stringify(result);
            },
          },
        };
      });

    const legacyTools: Array<{ legacyId: string; tool: ReActTool }> = [
      {
        legacyId: 'read_file',
        tool: {
          type: 'function',
          function: {
            name: 'read_file',
            description: 'Read the contents of a file',
            parameters: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path to read' },
              },
              required: ['path'],
            },
          },
          execute: async (args) => this.deps.readFile(String(args.path || '')),
        },
      },
      {
        legacyId: 'run_command',
        tool: {
          type: 'function',
          function: {
            name: 'run_command',
            description: 'Execute a shell command and return the output',
            parameters: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'Shell command to execute' },
              },
              required: ['command'],
            },
          },
          execute: async (args) => this.deps.runCommand(String(args.command || '')),
        },
      },
    ];

    const allTools: ReActTool[] = [
      ...capabilityTools.map(entry => entry.tool),
      ...legacyTools.map(entry => entry.tool),
    ];

    const allowedNames = toolNames?.length
      ? new Set(toolNames)
      : null;
    const filteredTools = allowedNames
      ? allTools.filter(tool => {
          const matchingCapability = capabilityTools.find(entry => entry.tool.function.name === tool.function.name);
          const legacy = legacyTools.find(entry => entry.tool.function.name === tool.function.name);
          return (
            allowedNames.has(tool.function.name) ||
            (matchingCapability ? allowedNames.has(matchingCapability.capabilityId) : false) ||
            (legacy ? allowedNames.has(legacy.legacyId) : false)
          );
        })
      : allTools;

    const sendEvent = this.deps.sendStreamEvent;
    const callbacks = sendEvent ? {
      onThought: (content: string) => sendEvent({ type: 'thought', content }),
      onAction: (toolName: string, args: Record<string, unknown>) => sendEvent({ type: 'action', content: `Calling ${toolName}`, tool: toolName, args }),
      onObservation: (content: string) => sendEvent({ type: 'observation', content }),
      onComplete: (content: string) => sendEvent({ type: 'complete', content }),
      onError: (content: string) => sendEvent({ type: 'error', content }),
    } : undefined;

    const result = await runReActLoop(llmConfig, query, filteredTools, callbacks, 10, context);
    return {
      ...result,
      contextPacket,
      availableTools: filteredTools.map(tool => tool.function.name),
    };
  }
}

export function createAgentRuntime(deps: AgentRuntimeDependencies) {
  return new AgentRuntime(deps);
}
