export type ConnectionStatus = 'unknown' | 'testing' | 'success' | 'error'

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  success: '可用',
  error: '错误',
  testing: '测试中',
  unknown: '未测试',
}

export const CONNECTION_STATUS_BADGE_CLASSES: Record<ConnectionStatus, string> = {
  success: 'bg-green-500/20 text-green-400',
  error: 'bg-red-500/20 text-red-400',
  testing: 'bg-yellow-500/20 text-yellow-400',
  unknown: 'bg-gray-500/20 text-gray-400',
}

export const CONNECTION_TEST_BUTTON_LABELS: Record<ConnectionStatus, string> = {
  success: '测试通过',
  error: '测试失败',
  testing: '测试中...',
  unknown: '测试连接',
}

export const TERMINAL_AGENT_COPY = {
  helpTitle: 'EasyTerminal 终端 Agent 命令',
  helpIntentTitle: '终端 Agent 帮助',
  helpIntentDescription: '终端 Agent 命令速查。',
  helpOpenedTitle: '已打开帮助',
  helpOpenedMessage: '已打开应用内命令手册，并定位到终端 Agent。',
  shellTitle: '终端 Agent',
  shellHelpTitle: '终端 Agent 帮助',
  skillHelpTitle: 'Skill 帮助',
  promptHelpTitle: 'Prompt 帮助',
  workflowHelpTitle: 'Workflow 帮助',
  contextHelpTitle: 'Context 帮助',
  easyTerminalHelpTitle: 'EasyTerminal 帮助',
  agentRunningTitle: '正在调用 Agent',
  agentResultTitle: 'Agent 返回',
  agentResultPanelTitle: '终端 Agent 结果',
  agentResultPanelDescription: '来自终端 Agent 的结构化返回。',
  capabilityRunningTitle: '正在调用能力',
  capabilityResultTitle: '能力结果',
  capabilityResultPanelDescription: '来自终端命令的能力执行结果。',
  capabilityResultPanelTitle: (label: string) => `能力结果 · ${label}`,
  errorTitle: '终端 Agent 错误',
  requestPrefix: '请求',
  usagePrefix: '用法：',
  emptyValue: '（空）',
  noAnswer: '（无返回内容）',
  unknownError: '未知错误',
  unknownCommandError: '未知命令错误',
  intentBadgeSnapshot: '上下文快照',
  intentBadgeResult: '结果面板',
  intentMetaTitle: '面板信息',
  intentNextStepTitle: '下一步',
  intentEmptyPayload: '当前没有可展示内容。',
  intentEmptyActions: '当前没有建议动作，直接阅读结果即可。',
  snapshotTitle: '上下文快照',
  resultPanelTitle: '结果面板',
  snapshotDescription: '来自 EasyTerminal Context Runtime 的上下文快照视图。',
  resultPanelDescription: '来自 Agent Runtime 的结构化结果展示。',
  activityRecordTitle: (commandName: string) => `终端 Agent ${commandName}`,
  activitySummary: (commandKind: string, status: 'success' | 'error', commandLine: string) =>
    `${commandKind} 命令${status === 'success' ? '执行完成' : '执行失败'}：${commandLine}`,
  capabilityCompleted: (label: string) => `${label} 执行完成。`,
  capabilityFailed: (label: string) => `${label} 执行失败。`,
} as const
