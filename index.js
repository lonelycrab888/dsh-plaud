import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { PlaudAccount } from './account.js'
import { registerSettings } from './settings-route.js'

const require = createRequire(import.meta.url)

export const name = 'dsh-plaud'
export const inject = ['mcpManager', 'skills', 'tools']

export function apply(ctx) {
  const plaudEntry = require.resolve('@plaud-ai/mcp')
  const meetingSkill = readFileSync(new URL('./skills/plaud-meeting-notes.md', import.meta.url), 'utf8')

  ctx.effect(() => ctx.mcpManager.register('plaud', {
    transport: 'stdio',
    command: process.execPath,
    args: [plaudEntry],
    env: {
      ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      PLAUD_TELEMETRY_DISABLED: '1',
      LOG_LEVEL: 'warn',
    },
    startupTimeoutMs: 20_000,
    // Plaud gives the user two minutes to complete the OAuth flow.
    toolCallTimeoutMs: 135_000,
  }), 'Plaud MCP server')

  ctx.effect(() => ctx.skills.register({
    name: 'plaud-meeting-notes',
    description: '用 Plaud 录音、已有纪要和原始转录生成带时间戳的 Markdown 会议纪要，提取决定、负责人和截止日期。 / Draft timestamped Markdown meeting notes from Plaud recordings.',
    source: 'bundled',
    content: meetingSkill,
  }), 'Plaud meeting notes skill')

  ctx.inject(['connection'], scope => {
    if (!scope.connection.fetch) return
    const account = new PlaudAccount(scope.tools)
    scope.effect(() => () => account.dispose(), 'Plaud account operations')
    scope.effect(() => registerSettings(scope, account), 'Plaud account settings')
  })
}
