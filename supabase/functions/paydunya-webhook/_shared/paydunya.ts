import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://ouimoove.vercel.app'

const PAYDUNYA_BASE = Deno.env.get('PAYDUNYA_MODE') === 'live'
  ? 'https://app.paydunya.com/api/v1'
  : 'https://app.paydunya.com/sandbox-api/v1'

const PD_HEADERS = {
  'PAYDUNYA-MASTER-KEY':  Deno.env.get('PAYDUNYA_MASTER_KEY')  ?? '',
  'PAYDUNYA-PRIVATE-KEY': Deno.env.get('PAYDUNYA_PRIVATE_KEY') ?? '',
  'PAYDUNYA-TOKEN':       Deno.env.get('PAYDUNYA_TOKEN')        ?? '',
}

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )
}

export async function confirmWithPaydunya(token: string) {
  const res = await fetch(`${PAYDUNYA_BASE}/checkout-invoice/confirm/${token}`, { headers: PD_HEADERS })
  return res.json().catch(() => null)
}

export async function sha512Hex(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-512', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

type CompleteResult = { status: 'completed' | 'failed'; handled: boolean; alreadyCompleted?: boolean }

// Confirms a PayDunya token with PayDunya's own servers, then completes the
// underlying order exactly once. Safe to call from both the browser
// return-flow and the PayDunya webhook — whichever call gets here first does
// the writes; the other is a no-op thanks to the conditional UPDATE below.
export async function confirmAndComplete(token: string): Promise<CompleteResult> {
  const admin  = adminClient()
  const pdData = await confirmWithPaydunya(token)

  const { data: pending } = await admin
    .from('pending_payments')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!pending) {
    return { status: pdData?.status === 'completed' ? 'completed' : 'failed', handled: false }
  }

  if (pending.status === 'completed') {
    return { status: 'completed', handled: false, alreadyCompleted: true }
  }

  if (pdData?.status !== 'completed') {
    const { data: claimed } = await admin
      .from('pending_payments')
      .update({ status: 'failed' })
      .eq('token', token)
      .eq('status', 'pending')
      .select('token')
    if (claimed && claimed.length > 0) {
      await admin.from('orders').delete().eq('id', pending.order_id)
      if (pending.type === 'resale') {
        await admin.from('ticket_listings').update({ status: 'active', buyer_id: null }).eq('id', pending.payload.listingId)
      }
    }
    return { status: 'failed', handled: true }
  }

  // Atomically claim the order — only the winner of this race performs the writes below.
  const { data: claimedOrder } = await admin
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', pending.order_id)
    .eq('payment_status', 'pending')
    .select('id')

  if (!claimedOrder || claimedOrder.length === 0) {
    await admin.from('pending_payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('token', token)
    return { status: 'completed', handled: false, alreadyCompleted: true }
  }

  const payload = pending.payload as Record<string, any>

  if (pending.type === 'resale') {
    await admin.from('order_items').insert({
      order_id:       pending.order_id,
      event_id:       payload.eventId,
      ticket_type_id: payload.ticketTypeId,
      quantity:       payload.quantity,
      unit_price_cfa: payload.askPrice,
      is_resale:      true,
    })
    await admin.from('order_items').update({ resold: true }).eq('id', payload.originalOrderItemId)
    await admin.from('ticket_listings').update({
      status: 'sold', buyer_id: pending.user_id, buyer_order_id: pending.order_id, sold_at: new Date().toISOString(),
    }).eq('id', payload.listingId)
  } else {
    const cart = (payload.cart ?? []) as Array<{ eventId: string; ticketTypeId: string; qty: number; price: number }>
    for (const item of cart) {
      await admin.from('order_items').insert({
        order_id:       pending.order_id,
        event_id:       item.eventId,
        ticket_type_id: item.ticketTypeId,
        quantity:       item.qty,
        unit_price_cfa: item.price,
      })
      const { data: tk } = await admin
        .from('ticket_types')
        .select('quantity_sold, quantity_total')
        .eq('id', item.ticketTypeId)
        .single()
      if (tk) {
        await admin
          .from('ticket_types')
          .update({ quantity_sold: Math.min((tk.quantity_sold || 0) + item.qty, tk.quantity_total) })
          .eq('id', item.ticketTypeId)
      }
    }
  }

  await admin.from('pending_payments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('token', token)

  // Notifications — fire-and-forget, only on the call that actually completed the order.
  if (pending.type !== 'resale') {
    const { data: userRes } = await admin.auth.admin.getUserById(pending.user_id)
    const email = userRes?.user?.email
    const name  = userRes?.user?.user_metadata?.full_name || email
    if (email) {
      const cart = (payload.cart ?? []) as Array<{ eventTitle: string; ticketName: string; price: number; qty: number }>
      admin.functions.invoke('send-ticket-email', {
        body: {
          to: email, userName: name, orderId: pending.order_id,
          items: cart.map((i) => ({ eventTitle: i.eventTitle, ticketName: i.ticketName, price: i.price, qty: i.qty })),
          total: payload.total, method: 'paydunya',
        },
      }).catch(() => {})
    }
  }
  admin.from('push_subscriptions').select('endpoint,p256dh,auth_key').eq('user_id', pending.user_id).then(({ data: subs }) => {
    for (const s of subs ?? []) {
      admin.functions.invoke('send-push', {
        body: {
          subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          title: '🎉 Paiement confirmé !', body: 'Vos billets sont prêts.', url: SITE_URL,
        },
      }).catch(() => {})
    }
  })

  return { status: 'completed', handled: true }
}
