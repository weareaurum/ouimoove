import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { confirmAndComplete, sha512Hex } from './_shared/paydunya.ts'

// PayDunya IPN: POST, application/x-www-form-urlencoded, bracket-notation
// nested fields (e.g. data[invoice][token], data[hash], data[status]).
// No Supabase JWT is sent — PayDunya's servers call this directly, so
// authenticity is verified via data.hash === sha512(PAYDUNYA_MASTER_KEY)
// instead (this function is deployed with verify_jwt disabled).
function parseBracketForm(form: FormData): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [rawKey, value] of form.entries()) {
    const keys = rawKey.replace(/\]/g, '').split('[')
    let node = result
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!node[k] || typeof node[k] !== 'object') node[k] = {}
      node = node[k]
    }
    node[keys[keys.length - 1]] = value
  }
  return result
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')

  try {
    const form   = await req.formData()
    const parsed = parseBracketForm(form)
    const data   = parsed.data ?? {}

    const expectedHash = await sha512Hex(Deno.env.get('PAYDUNYA_MASTER_KEY') ?? '')
    if (!data.hash || data.hash !== expectedHash) {
      console.error('paydunya-webhook: hash mismatch, rejecting')
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 })
    }

    const token = data?.invoice?.token ?? data?.token
    if (!token) {
      console.error('paydunya-webhook: no token in payload')
      return new Response(JSON.stringify({ error: 'missing token' }), { status: 400 })
    }

    const result = await confirmAndComplete(token)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('paydunya-webhook error:', err)
    // Non-2xx so PayDunya retries delivery on transient failures.
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
