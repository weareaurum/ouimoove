import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// Deno edge functions are stateless per-invocation (no reliable shared
// memory across requests/instances), so rate limiting has to be backed by
// the DB — see the check_rate_limit() function in
// supabase/migrations/pending_rate_limiting.sql.
export async function isRateLimited(req: Request, routeName: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: `${routeName}:${ip}`,
    p_max_count: maxCount,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('rate limit check failed, failing open:', error)
    return false // don't block real traffic if the rate-limit table itself has an issue
  }
  return data === false
}

export function rateLimitedResponse(cors: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: 'Trop de requêtes. Réessayez dans un instant.' }), {
    status: 429,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
