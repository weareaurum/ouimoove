import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { confirmAndComplete } from './_shared/paydunya.ts'
import { isRateLimited, rateLimitedResponse } from './_shared/rateLimit.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (await isRateLimited(req, 'verify-paydunya-payment', 20, 300)) return rateLimitedResponse(CORS)

  try {
    const { token } = await req.json()
    if (!token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400, headers: CORS })

    const result = await confirmAndComplete(token)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
