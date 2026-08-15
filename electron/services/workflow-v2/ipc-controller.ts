import { z } from 'zod'
import { workflowDefinitionSchema } from '../../../src/features/workflow-v2/domain/schemas'

export const workflowExecuteRequestSchema = z.object({
  workflowId: z.string().min(1),
  revision: z.number().int().positive().optional(),
  input: z.record(z.string(), z.unknown()),
  runId: z.string().min(1).optional(),
})

export const workflowCancelRequestSchema = z.object({ runId: z.string().min(1) })
export const workflowResumeConfirmationRequestSchema = z.object({
  confirmationId: z.string().min(1),
  approved: z.boolean(),
})
export const workflowSaveRevisionRequestSchema = workflowDefinitionSchema

export type WorkflowExecuteRequest = z.infer<typeof workflowExecuteRequestSchema>
export type WorkflowCancelRequest = z.infer<typeof workflowCancelRequestSchema>
export type WorkflowResumeConfirmationRequest = z.infer<typeof workflowResumeConfirmationRequestSchema>

export function parseWorkflowExecuteRequest(input: unknown): WorkflowExecuteRequest {
  return workflowExecuteRequestSchema.parse(input)
}

export function parseWorkflowCancelRequest(input: unknown): WorkflowCancelRequest {
  return workflowCancelRequestSchema.parse(input)
}

export function parseWorkflowResumeConfirmationRequest(input: unknown): WorkflowResumeConfirmationRequest {
  return workflowResumeConfirmationRequestSchema.parse(input)
}
