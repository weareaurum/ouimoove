import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYDUNYA_BASE = Deno.env.get('PAYDUNYA_MODE') === 'live'
  ? 'https://app.paydunya.com/api/v1'
  : 'https://app.paydunya.com/sandbox-api/v1'

const PD_HEADERS = {
  'PAYDUNYA-MASTER-KEY':  Deno.env.get('PAYDUNYA_MASTER_KEY')  ?? '',
  'PAYDUNYA-PRIVATE-KEY': Deno.env.get('PAYDUNYA_PRIVATE_KEY') ?? '',
  'PAYDUNYA-TOKEN':       Deno.env.get('PAYDUNYA_TOKEN')        ?? '',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { cart, total, userId, returnUrl, cancelUrl, method, phone } = await req.json()

    const items = (cart ?? []).map((i: { eventTitle: string; ticketName: string; qty: number; price: number }) => ({
      name:       `${i.eventTitle} — ${i.ticketName}`,
      quantity:   i.qty,
      unit_price: i.price,
      total_price: i.price * i.qty,
      description: 'Billet OuiMoove',
    }))

    const body: Record<string, unknown> = {
      invoice: {
        total_amount: total,
        description: `OuiMoove — ${items.length} billet(s)`,
        items,
      },
      store: {
        name:    Deno.env.get('PAYDUNYA_STORE_NAME') ?? 'OuiMoove',
        tagline: 'Vos billets, partout au Togo',
        logo_url: 'https://ouimoove.vercel.app/ouimoove-logo.png',
      },
      actions: {
        cancel_url:   cancelUrl,
        return_url:   returnUrl,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-webhook`,
      },
      custom_data: { user_id: userId },
    }

    // Pre-fill phone for mobile money
    if (method !== 'card' && phone) {
      body.customer = { phone_number: phone }
    }

    const res  = await fetch(`${PAYDUNYA_BASE}/checkout-invoice/create`, {
      method:  'POST',
      headers: PD_HEADERS,
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    // PayDunya's own response already contains the correct customer-facing
    // checkout URL in response_text (e.g. https://payment.paydunya.com/payment/{token})
    // — use it verbatim instead of guessing a URL pattern ourselves.
    const checkout_url = data?.response_code === '00' ? data?.response_text ?? null : null

    return new Response(JSON.stringify({ ...data, checkout_url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
