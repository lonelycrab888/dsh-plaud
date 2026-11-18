import { randomUUID } from 'node:crypto'

const pendingPhase = {
  refresh: 'checking',
  login: 'authorizing',
  logout: 'signing-out',
}

const needsLogin = /not authenticated|unauthorized|\b401\b/i

function failureCode(message) {
  if (/timed?\s*out|timeout/i.test(message)) return 'timeout'
  if (/authentication denied|user declined/i.test(message)) return 'denied'
  if (/port .*in use|EADDRINUSE/i.test(message)) return 'callback-busy'
  return 'request-failed'
}

/** Account management shares the same official MCP server as conversation tools. */
export class PlaudAccount {
  #lifetime = new AbortController()
  #operation
  #state = { phase: 'idle' }

  constructor(tools) {
    this.tools = tools
  }

  view() {
    return this.#state
  }

  begin(action) {
    if (this.#operation || this.#lifetime.signal.aborted) return this.view()
    const phase = pendingPhase[action]
    if (!Object.hasOwn(pendingPhase, action)) throw new TypeError('Unknown Plaud account operation')

    this.#state = { phase }
    this.#operation = this.#run(action)
      .catch(() => ({ phase: 'unavailable', error: 'request-failed' }))
      .then(state => {
        if (!this.#lifetime.signal.aborted) this.#state = state
      })
      .finally(() => { this.#operation = undefined })
    return this.view()
  }

  dispose() {
    this.#lifetime.abort()
  }

  async #run(action) {
    if (action === 'refresh') return this.#check()
    const result = await this.#call(action, action === 'login' ? 132_000 : 20_000)
    if (result.error) {
      return {
        phase: 'unavailable',
        error: result.error === 'request-failed' ? failureCode(result.message) : result.error,
      }
    }

    const state = await this.#check()
    if (action === 'logout' && state.phase === 'connected') {
      return { phase: 'connected', error: 'sign-out-failed' }
    }
    if (action === 'login' && state.phase === 'disconnected') {
      return { phase: 'disconnected', error: 'request-failed' }
    }
    return state
  }

  async #check() {
    const result = await this.#call('get_current_user', 12_000)
    if (result.error) {
      if (result.error === 'request-failed' && needsLogin.test(result.message)) return { phase: 'disconnected' }
      return { phase: 'unavailable', error: result.error }
    }
    const identity = JSON.parse(result.message)
    if (identity === null || typeof identity !== 'object' || Array.isArray(identity) || Object.keys(identity).length === 0) {
      return { phase: 'unavailable', error: 'request-failed' }
    }
    return { phase: 'connected' }
  }

  async #call(action, timeoutMs) {
    const name = 'mcp__plaud__' + action
    if (!this.tools.executable(name)) return { error: 'mcp-unavailable' }

    const deadline = AbortSignal.timeout(timeoutMs)
    const signal = AbortSignal.any([this.#lifetime.signal, deadline])
    const batch = await this.tools.execute({
      calls: [{ type: 'tool-call', name, id: randomUUID(), arguments: '{}' }],
      signal,
    })
    if (deadline.aborted) return { error: 'timeout' }
    const result = batch.results[0]?.result
    const message = result?.content.filter(block => block.type === 'text').map(block => block.text).join('\n') ?? ''
    if (!result || result.isError) return { error: 'request-failed', message: message || result?.error?.message || '' }
    return { message }
  }
}
