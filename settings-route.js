const path = '/api/dsh-plaud.account'

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function registerSettings(ctx, account) {
  return ctx.connection.fetch.register({
    path,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    async fetch(request) {
      const site = request.headers.get('sec-fetch-site')
      if (request.headers.get('x-dsh-plaud') !== 'settings' || (site && site !== 'same-origin')) {
        return json({ error: 'forbidden' }, 403)
      }
      if (request.method === 'GET') return json(account.view())
      if (request.headers.get('content-type') !== 'application/json') {
        return json({ error: 'invalid-request' }, 400)
      }

      const input = await request.json().catch(() => null)
      if (!['refresh', 'login', 'logout'].includes(input?.action)) {
        return json({ error: 'invalid-request' }, 400)
      }
      return json(account.begin(input.action))
    },
  })
}
