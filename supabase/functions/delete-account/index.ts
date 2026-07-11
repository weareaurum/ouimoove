import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { isRateLimited, rateLimitedResponse } from './_shared/rateLimit.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// NOTE: requires the `orders.buyer_name` / `buyer_email` / `buyer_account_deleted`
// columns and the orders.user_id FK changed to ON DELETE SET NULL (see the
// account-deletion migration) so that deleting the auth user doesn't cascade
// away the buyer's transaction history.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Deletion is a deliberate, rare action — 5 attempts/hour/IP is generous.
  if (await isRateLimited(req, 'delete-account', 5, 3600)) return rateLimitedResponse(CORS)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const anon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userRes, error: userErr } = await anon.auth.getUser()
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié.' }), { status: 401, headers: CORS })
    }
    const userId = userRes.user.id

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    )

    // Block if this user organizes an upcoming published event with sold tickets.
    const { data: upcoming } = await admin
      .from('events')
      .select('id, title, event_date, ticket_types(quantity_sold)')
      .eq('organizer_id', userId)
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString())

    const blocking = (upcoming ?? []).find((e: any) =>
      (e.ticket_types ?? []).some((t: any) => (t.quantity_sold ?? 0) > 0))
    if (blocking) {
      return new Response(JSON.stringify({
        error: `Vous organisez un événement à venir ("${blocking.title}") avec des billets déjà vendus. Contactez-nous à weareaurumgroup@gmail.com avant de supprimer votre compte.`,
      }), { status: 400, headers: CORS })
    }

    // Purge feed posts + their storage files (UGC).
    const { data: posts } = await admin.from('event_posts').select('id, media_url').eq('user_id', userId)
    for (const p of posts ?? []) {
      const marker = '/object/public/event-posts/'
      const idx = p.media_url?.indexOf(marker) ?? -1
      if (idx !== -1) {
        await admin.storage.from('event-posts').remove([p.media_url.slice(idx + marker.length)])
      }
    }
    await admin.from('event_posts').delete().eq('user_id', userId)

    // Verification documents (ID uploads) + storage.
    const { data: verifs } = await admin.from('verification_requests').select('id, document_url').eq('user_id', userId)
    for (const v of verifs ?? []) {
      const marker = '/object/'
      const idx = v.document_url ? v.document_url.indexOf(marker) : -1
      if (idx !== -1) {
        const path = v.document_url.slice(idx + marker.length).replace(/^sign\//, '').replace(/^public\//, '')
        const [bucket, ...rest] = path.split('/')
        await admin.storage.from(bucket).remove([rest.join('/')]).catch(() => {})
      }
    }
    await admin.from('verification_requests').delete().eq('user_id', userId)

    // Other personal data with no retention requirement.
    await admin.from('favorites').delete().eq('user_id', userId)
    await admin.from('organizer_applications').delete().eq('user_id', userId)
    await admin.from('city_requests').delete().eq('user_id', userId)
    await admin.from('push_subscriptions').delete().eq('user_id', userId)

    // Cancel active resale listings, restore any reserved state.
    await admin.from('ticket_listings').update({ status: 'cancelled' }).eq('seller_id', userId).eq('status', 'active')

    // Keep transaction history for accounting/admin, but hide the buyer's
    // identity from organizer-facing views.
    await admin.from('orders').update({ buyer_account_deleted: true }).eq('user_id', userId)

    // Finally remove the auth account itself (orders.user_id is ON DELETE
    // SET NULL, so history above is preserved).
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) {
      console.error('delete-account: deleteUser failed', delErr)
      return new Response(JSON.stringify({ error: "Erreur lors de la suppression du compte." }), { status: 500, headers: CORS })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('delete-account error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: CORS })
  }
})
