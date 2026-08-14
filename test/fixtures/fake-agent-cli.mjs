#!/usr/bin/env node

import readline from 'node:readline'

const terminalSessionId = process.env.EASYTERMINAL_TERMINAL_SESSION_ID ?? ''
const channelToken = process.env.EASYTERMINAL_CHANNEL_TOKEN ?? ''
const hookSocket = process.env.EASYTERMINAL_HOOK_SOCKET ?? ''
const instanceId = process.env.EASYTERMINAL_INSTANCE_ID ?? ''
const agentSessionId = process.env.FAKE_AGENT_SESSION_ID ?? `fake-agent-${Date.now()}`

const writeEvent = (eventType, payload = {}, interactionId) => {
  const event = {
    schemaVersion: 1,
    eventId: `fake-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    eventType,
    agentType: 'fake-agent',
    source: 'hook',
    terminalSessionId,
    agentSessionId,
    instanceId,
    channelToken,
    ...(interactionId ? { interactionId } : {}),
    revision: 1,
    occurredAt: Date.now(),
    payload,
  }

  // The fixture writes protocol envelopes to stdout. The integration harness
  // can pipe them into HookServer without a platform-specific socket.
  process.stdout.write(`${JSON.stringify({ hookSocket, event })}\n`)
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on('line', (line) => {
  const command = line.trim()
  if (command === 'start') writeEvent('session.started', { status: 'ready' })
  else if (command === 'processing') writeEvent('session.processing', { status: 'processing' })
  else if (command === 'complete') writeEvent('session.completed', { status: 'completed' })
  else if (command === 'approval-like-text') process.stdout.write('Do you want to continue? [y/N]\n')
  else if (command.startsWith('permission ')) {
    const interactionId = command.slice('permission '.length).trim() || `permission-${Date.now()}`
    writeEvent('interaction.permission', {
      title: '请求执行命令',
      detail: 'npm test',
      capabilities: { allow_once: true, deny: true, allow_always: false },
      options: [],
    }, interactionId)
  }
})

writeEvent('session.started', { status: 'ready' })
