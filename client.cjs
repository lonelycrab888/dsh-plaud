window.__ModuleLoader__.load({
  id: 'dsh-plaud',
  factory(require) {
    const { createElement: h, useEffect, useId, useRef, useState } = require('react')
    const namespace = 'settings.plaud'
    const activePhases = new Set(['checking', 'authorizing', 'signing-out'])
    const copy = {
      en: {
        title: 'Plaud',
        account: 'Plaud account',
        description: 'Connect Plaud to use your synced recordings, transcripts, and summaries in DSH.',
        signInTitle: 'Sign in to Plaud',
        manage: 'Manage account',
        open: 'Open sign-in window',
        signIn: 'Sign in in browser',
        signOut: 'Sign out',
        confirmSignOut: 'Confirm sign-out',
        signOutHint: 'Signing out disconnects the Plaud account on this computer from clients that share the official MCP authorization.',
        refresh: 'Refresh status',
        close: 'Close',
        cancel: 'Back',
        browserHint: 'The Plaud authorization page opens in the browser on the computer running DSH. Complete sign-in within two minutes, then return here.',
        authorizingHint: 'Complete authorization in the browser on the computer running DSH. You can close this window while Plaud waits.',
        idle: 'Checking connection…',
        checking: 'Checking connection…',
        disconnected: 'Signed out',
        connected: 'Signed in',
        authorizing: 'Waiting for browser authorization…',
        'signing-out': 'Signing out…',
        unavailable: 'Connection status unavailable',
        'mcp-unavailable': 'Plaud MCP is unavailable. Check that the plugin is enabled, then refresh.',
        timeout: 'The request timed out. If the authorization page did not open, try signing in again on the computer running DSH.',
        denied: 'Plaud authorization was declined. You can try again.',
        'callback-busy': 'Another Plaud sign-in is in progress. Finish it in the browser or retry after it times out.',
        'request-failed': 'Plaud could not complete the request. Check the connection and try again.',
        'sign-out-failed': 'Plaud still reports this account as signed in. Try signing out again.',
        'settings-unavailable': 'The Plaud settings service is unavailable. Reopen settings or restart this DSH profile.',
      },
      zh: {
        title: 'Plaud',
        account: 'Plaud 账户',
        description: '连接后，可以在 DSH 中使用已同步的录音、转录和纪要。',
        signInTitle: '登录 Plaud',
        manage: '管理账户',
        open: '打开登录窗口',
        signIn: '在浏览器登录',
        signOut: '退出登录',
        confirmSignOut: '确认退出',
        signOutHint: '退出会断开本机共用 Plaud 官方 MCP 授权的客户端。',
        refresh: '刷新状态',
        close: '关闭',
        cancel: '返回',
        browserHint: 'Plaud 授权页会在运行 DSH 的电脑上打开。请在两分钟内完成登录，再返回这里。',
        authorizingHint: '请在运行 DSH 的电脑上完成浏览器授权。等待期间可以关闭这个窗口。',
        idle: '正在检查连接…',
        checking: '正在检查连接…',
        disconnected: '未登录',
        connected: '已登录',
        authorizing: '正在等待浏览器授权…',
        'signing-out': '正在退出登录…',
        unavailable: '暂时无法确认连接状态',
        'mcp-unavailable': 'Plaud MCP 暂不可用。确认插件已启用后刷新。',
        timeout: '请求已超时。如果授权页没有打开，请在运行 DSH 的电脑上再次发起登录。',
        denied: 'Plaud 授权已被拒绝，可以重新登录。',
        'callback-busy': '已有 Plaud 登录正在进行。请先在浏览器完成授权，或等待超时后重试。',
        'request-failed': 'Plaud 未能完成请求。请检查网络后重试。',
        'sign-out-failed': 'Plaud 仍显示该账户已登录，请重试退出。',
        'settings-unavailable': '无法访问 Plaud 设置服务。请重新打开设置，或重启当前 DSH profile。',
      },
    }

    async function request(action, signal) {
      const response = await fetch('api/dsh-plaud.account', {
        method: action ? 'POST' : 'GET',
        headers: { 'x-dsh-plaud': 'settings', ...(action ? { 'content-type': 'application/json' } : {}) },
        ...(action ? { body: JSON.stringify({ action }) } : {}),
        signal,
      })
      if (!response.ok) throw new Error('Plaud settings request failed')
      return response.json()
    }

    const unavailable = { phase: 'unavailable', error: 'settings-unavailable' }

    function button(label, onClick, options = {}) {
      return h('button', {
        type: 'button',
        className: options.primary ? 'dsh-plaud-button dsh-plaud-primary' : 'dsh-plaud-button',
        disabled: options.disabled,
        onClick,
      }, label)
    }

    function makeSettings(t) {
      return function PlaudSettings() {
        const [view, setView] = useState({ phase: 'idle' })
        const [sending, setSending] = useState(false)
        const [confirming, setConfirming] = useState(false)
        const lifetime = useRef(null)
        const dialog = useRef(null)
        const requestInFlight = useRef(false)
        const titleId = useId()
        const hintId = useId()
        const phase = view.phase
        const connected = phase === 'connected'
        const busy = sending || phase === 'idle' || activePhases.has(phase)
        const serviceUnavailable = view.error === 'mcp-unavailable' || view.error === 'settings-unavailable'

        async function run(action) {
          const signal = lifetime.current?.signal
          if (!signal || signal.aborted || requestInFlight.current) return
          requestInFlight.current = true
          if (dialog.current?.open) dialog.current.querySelector('button')?.focus()
          setSending(true)
          try {
            const result = await request(action, signal)
            if (!signal.aborted) setView(result)
          } catch {
            if (!signal.aborted) setView(unavailable)
          } finally {
            requestInFlight.current = false
            if (!signal.aborted) setSending(false)
          }
        }

        useEffect(() => {
          const controller = new AbortController()
          lifetime.current = controller
          // Settings handles Escape at document level. Keep dismissal with the topmost dialog.
          function handleModalKey(event) {
            if (!dialog.current?.open) return
            if (event.key === 'Tab') event.stopPropagation()
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            dialog.current.close()
          }
          window.addEventListener('keydown', handleModalKey, true)
          void run('refresh')
          return () => {
            window.removeEventListener('keydown', handleModalKey, true)
            controller.abort()
            lifetime.current = null
            requestInFlight.current = false
          }
        }, [])

        useEffect(() => {
          if (sending || !activePhases.has(phase)) return
          const controller = new AbortController()
          let timer
          async function poll() {
            try {
              const result = await request(undefined, controller.signal)
              if (controller.signal.aborted) return
              setView(result)
              if (activePhases.has(result.phase)) timer = setTimeout(poll, 700)
            } catch {
              if (!controller.signal.aborted) setView(unavailable)
            }
          }
          timer = setTimeout(poll, 450)
          return () => { controller.abort(); clearTimeout(timer) }
        }, [sending, phase])

        const open = () => {
          setConfirming(false)
          if (!dialog.current.open) dialog.current.showModal()
        }
        const close = () => dialog.current.close()
        const message = role => h('p', { role, className: 'dsh-plaud-status' }, t(phase))
        const error = () => view.error && h('p', { role: 'alert', className: 'dsh-plaud-error' }, t(view.error))
        const browserHint = phase === 'authorizing' ? 'authorizingHint' : 'browserHint'
        const hint = confirming ? 'signOutHint' : connected ? 'description' : browserHint

        return h('section', { className: 'dsh-plaud-settings', 'aria-label': t('title') },
          h('h2', null, t('title')),
          h('div', { className: 'dsh-plaud-card' },
            h('h3', null, t('account')),
            h('p', null, t('description')),
            message('status'),
            error(),
            h('div', { className: 'dsh-plaud-actions' },
              button(t(connected ? 'manage' : 'open'), open, { primary: true }),
              button(t('refresh'), () => void run('refresh'), { disabled: busy }))),
          h('dialog', {
            className: 'dsh-plaud-dialog',
            ref: dialog,
            'aria-labelledby': titleId,
            'aria-describedby': hintId,
            onCancel: event => event.stopPropagation(),
            onClose: () => setConfirming(false),
          },
          h('div', { className: 'dsh-plaud-dialog-content' },
            h('h3', { id: titleId }, t(connected ? 'account' : 'signInTitle')),
            h('p', { id: hintId }, t(hint)),
            message('status'),
            error(),
            h('div', { className: 'dsh-plaud-actions' },
              confirming
                ? button(t('cancel'), () => setConfirming(false))
                : button(t('close'), close),
              connected && (confirming
                ? button(t('confirmSignOut'), () => { setConfirming(false); void run('logout') }, { primary: true, disabled: busy })
                : button(t('signOut'), () => setConfirming(true), { disabled: busy })),
              !connected && !busy && (serviceUnavailable
                ? button(t('refresh'), () => void run('refresh'), { primary: true })
                : button(t('signIn'), () => void run('login'), { primary: true }))))),
        )
      }
    }

    const styles = `
      .dsh-plaud-settings { display: grid; gap: 16px; max-width: 720px; padding: 8px 0; color: var(--dsw-alias-label-primary); }
      .dsh-plaud-settings h2, .dsh-plaud-settings h3, .dsh-plaud-settings p { margin: 0; }
      .dsh-plaud-settings h2 { font-size: 20px; font-weight: 600; }
      .dsh-plaud-settings h3 { font-size: 16px; font-weight: 600; }
      .dsh-plaud-settings p { color: var(--dsw-alias-label-secondary); font-size: 14px; line-height: 1.55; }
      .dsh-plaud-card { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); }
      .dsh-plaud-settings .dsh-plaud-status { color: var(--dsw-alias-label-primary); font-weight: 500; }
      .dsh-plaud-settings .dsh-plaud-error { color: var(--dsw-alias-state-error-primary); }
      .dsh-plaud-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
      .dsh-plaud-button { min-height: 34px; padding: 5px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; font: inherit; font-size: 13px; }
      .dsh-plaud-primary { border-color: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-state-business-primary); }
      .dsh-plaud-button:enabled:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .dsh-plaud-button:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px; }
      .dsh-plaud-button:disabled { opacity: .55; cursor: default; }
      .dsh-plaud-dialog { box-sizing: border-box; inline-size: min(440px, calc(100% - 32px)); margin: auto; padding: 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }
      .dsh-plaud-dialog-content { display: grid; gap: 12px; padding: 20px; }
      .dsh-plaud-dialog .dsh-plaud-actions { justify-content: flex-end; }
    `

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(namespace)
        ctx.effect(() => ctx.locale.register(namespace, copy), 'Plaud settings translations')
        ctx.effect(() => {
          const style = document.createElement('style')
          style.textContent = styles
          document.head.append(style)
          return () => style.remove()
        }, 'Plaud settings style')
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-plaud',
          order: 61,
          label: () => t('title'),
          locale: namespace,
        }, makeSettings(t)))
      },
    }
  },
})
