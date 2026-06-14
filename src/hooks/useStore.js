import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_EVENTS } from '../data/events.js'
import { supabase } from '../lib/supabase.js'

// Set VITE_PAYMENT_MODE=paydunya in .env (and Vercel env vars) to use real PayDunya payments.
// Default is 'simulation' (direct DB insert as paid — no redirect).
const PAYMENT_MODE = import.meta.env.VITE_PAYMENT_MODE || 'simulation'

// ─── Shape helpers ────────────────────────────────────────────
function shapeEvent(event) {
  const d = new Date(event.event_date)
  return {
    id:        event.id,
    title:     event.title,
    category:  event.category || '',
    date:      d.toISOString().slice(0, 10),
    time:      d.toISOString().slice(11, 16),
    location:  event.venue || '',
    city:      event.city  || '',
    desc:      event.description || '',
    emoji:     event.emoji || '🎟️',
    imageUrl:  event.image_url || null,
    status:    event.status,
    tickets:   (event.ticket_types || []).map((t) => ({
      id:    t.id,
      name:  t.name,
      price: t.price_cfa,
      total: t.quantity_total,
      sold:  t.quantity_sold,
    })),
    organizer: event.organizer_id,
  }
}

function shapeMyOrder(order, eventsRef, userName = '') {
  const items = (order.order_items || []).map((item) => {
    const ev = eventsRef.find((e) => e.id === item.event_id)
    const tk = ev?.tickets.find((t) => t.id === item.ticket_type_id)
    return {
      id:         item.id,
      eventId:    item.event_id,
      eventTitle: ev?.title ?? 'Événement',
      ticketName: tk?.name  ?? 'Billet',
      price:      item.unit_price_cfa,
      qty:        item.quantity,
      checkedIn:  item.checked_in,
      isResale:   item.is_resale || false,
      resold:     item.resold    || false,
    }
  })
  return {
    id:       order.id,
    userId:   order.user_id,
    userName: userName,
    date:     order.created_at,
    items,
    total:    order.total_cfa,
    method:   order.payment_method,
    status:   order.payment_status,
  }
}

// ─── Hook ─────────────────────────────────────────────────────
export function useStore() {
  const [user,            setUserState]       = useState(null)
  const [userRole,        setUserRole]        = useState('user')
  const [events,          setEventsState]     = useState([])
  const [cart,            setCartState]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('om_cart')) || [] } catch { return [] }
  })
  const [myOrders,        setMyOrders]        = useState([])
  const [organizerOrders, setOrganizerOrders] = useState([])
  const [organizerStats,  setOrganizerStats]  = useState(null)
  const [favorites,       setFavoritesState]  = useState([])
  const [applications,    setApplications]    = useState([])
  const [resaleListings,  setResaleListings]  = useState([])

  const [loading, setLoading] = useState({
    events: true, orders: false, orgOrders: false, stats: false, resale: false,
  })
  const [errors, setErrors] = useState({
    events: null, orders: null, orgOrders: null, stats: null, resale: null,
  })

  const setLoad = (k, v) => setLoading((p) => ({ ...p, [k]: v }))
  const setErr  = (k, v) => setErrors((p) => ({ ...p, [k]: v }))

  const setCart = useCallback((v) => {
    setCartState(v)
    try { localStorage.setItem('om_cart', JSON.stringify(v)) } catch {}
  }, [])

  // ── LOAD EVENTS ────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoad('events', true)
    setErr('events', null)

    const { data, error } = await supabase
      .from('events')
      .select(`
        id, title, description, city, venue, category,
        event_date, emoji, image_url, status, organizer_id,
        ticket_types (id, name, price_cfa, quantity_total, quantity_sold)
      `)
      .eq('status', 'published')
      .order('event_date', { ascending: true })

    setLoad('events', false)

    if (error) {
      console.error('loadEvents:', error)
      setErr('events', error.message)
      setEventsState(DEFAULT_EVENTS)
      return DEFAULT_EVENTS
    }

    const shaped = (data || []).map(shapeEvent)
    setEventsState(shaped)
    return shaped
  }, [])

  // ── LOAD RESALE LISTINGS ────────────────────────────────────
  const loadResaleListings = useCallback(async () => {
    setLoad('resale', true)
    setErr('resale', null)

    const { data, error } = await supabase
      .from('ticket_listings')
      .select('*')
      .eq('status', 'active')
      .order('event_date', { ascending: true })

    setLoad('resale', false)

    if (error) {
      console.error('loadResaleListings:', error)
      setErr('resale', error.message)
      return
    }

    setResaleListings(data || [])
  }, [])

  // ── LOAD USER ROLE ─────────────────────────────────────────
  const loadUserRole = useCallback(async (userId) => {
    if (!userId) return 'user'
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    const role = data?.role || 'user'
    setUserRole(role)
    return role
  }, [])

  // ── LOAD FAVORITES ─────────────────────────────────────────
  const loadFavorites = useCallback(async (userId) => {
    if (!userId) return
    const { data } = await supabase
      .from('favorites')
      .select('event_id')
      .eq('user_id', userId)
    setFavoritesState((data || []).map((f) => f.event_id))
  }, [])

  // ── LOAD MY ORDERS ─────────────────────────────────────────
  const loadMyOrders = useCallback(async (userId, eventsData, userName = '') => {
    if (!userId) return
    setLoad('orders', true)
    setErr('orders', null)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, user_id, total_cfa, payment_method, payment_status, created_at,
        order_items (id, event_id, ticket_type_id, quantity, unit_price_cfa, checked_in, is_resale, resold)
      `)
      .eq('user_id', userId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })

    setLoad('orders', false)

    if (error) {
      console.error('loadMyOrders:', error)
      setErr('orders', error.message)
      return
    }

    const src = eventsData || events
    setMyOrders((data || []).map((o) => shapeMyOrder(o, src, userName)))
  }, [events])

  // ── LOAD ORGANIZER ORDERS ───────────────────────────────────
  const loadOrganizerOrders = useCallback(async (userId, eventsData) => {
    if (!userId) return
    setLoad('orgOrders', true)
    setErr('orgOrders', null)

    const src = eventsData || events
    const myEventIds = src.filter((e) => e.organizer === userId).map((e) => e.id)

    if (!myEventIds.length) {
      setOrganizerOrders([])
      setLoad('orgOrders', false)
      return
    }

    const { data, error } = await supabase
      .from('organizer_attendees')
      .select('*')
      .in('event_id', myEventIds)
      .order('purchased_at', { ascending: false })

    setLoad('orgOrders', false)

    if (error) {
      console.error('loadOrganizerOrders:', error)
      setErr('orgOrders', error.message)
      return
    }

    const grouped = {}
    for (const row of data || []) {
      if (!grouped[row.order_id]) {
        grouped[row.order_id] = {
          id:        row.order_id,
          userId:    row.attendee_id,
          userName:  row.attendee_name  || 'Anonyme',
          userEmail: row.attendee_email || '',
          userPhone: row.attendee_phone || '',
          date:      row.purchased_at,
          method:    row.payment_method,
          status:    row.payment_status || 'paid',
          total:     0,
          items:     [],
        }
      }
      grouped[row.order_id].items.push({
        id:          row.item_id,
        eventId:     row.event_id,
        eventTitle:  row.event_title,
        ticketName:  row.ticket_type_name,
        price:       row.unit_price_cfa,
        qty:         row.quantity,
        checkedIn:   row.checked_in,
        checkedInAt: row.checked_in_at,
        isResale:    row.is_resale || false,
        resold:      row.resold    || false,
      })
      grouped[row.order_id].total += row.unit_price_cfa * row.quantity
    }

    setOrganizerOrders(Object.values(grouped))
  }, [events])

  // ── LOAD ORGANIZER STATS ────────────────────────────────────
  const loadOrganizerStats = useCallback(async (userId) => {
    if (!userId) return
    setLoad('stats', true)
    setErr('stats', null)

    const { data, error } = await supabase
      .rpc('organizer_stats', { org_id: userId })

    setLoad('stats', false)

    if (error) {
      console.error('loadOrganizerStats:', error)
      setErr('stats', error.message)
      return
    }

    setOrganizerStats(data)
  }, [])

  // ── AUTH STATE ─────────────────────────────────────────────
  useEffect(() => {
    loadEvents()
    loadResaleListings()

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u) {
        const profile = { id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email }
        setUserState(profile)
        loadUserRole(u.id)
        loadFavorites(u.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      if (u) {
        const profile = { id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email }
        setUserState(profile)
        loadUserRole(u.id)
        loadFavorites(u.id)
      } else {
        setUserState(null)
        setUserRole('user')
        setFavoritesState([])
        setMyOrders([])
        setOrganizerOrders([])
        setOrganizerStats(null)
        setApplications([])
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id || events.length === 0) return
    loadMyOrders(user.id, events, user.name)
    loadOrganizerOrders(user.id, events)
    if (userRole === 'organizer' || userRole === 'admin') {
      loadOrganizerStats(user.id)
    }
    if (userRole === 'admin') {
      loadApplications()
    }
  }, [user?.id, userRole, events.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── AUTH ACTIONS ───────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    if (!email || !password) return { ok: false, error: 'Email et mot de passe requis.' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    const u = data.user
    const profile = { id: u.id, name: u.user_metadata?.full_name || u.email, email: u.email }
    setUserState(profile)
    await loadUserRole(u.id)
    await loadFavorites(u.id)
    return { ok: true, user: profile }
  }, [loadUserRole, loadFavorites])

  const signup = useCallback(async (name, email, password) => {
    if (!name || !email || !password) return { ok: false, error: 'Tous les champs sont requis.' }
    if (password.length < 6) return { ok: false, error: 'Mot de passe trop court (6 car. min).' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) return { ok: false, error: error.message }
    const u = data.user
    if (!u) return { ok: false, error: 'Création du compte impossible.' }
    const profile = { id: u.id, name, email: u.email }
    setUserState(profile)
    if (!data.session) return { ok: true, user: profile, needsEmailConfirmation: true }
    await loadFavorites(u.id)
    return { ok: true, user: profile }
  }, [loadFavorites])

  const googleLogin = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUserState(null)
    setUserRole('user')
    setFavoritesState([])
    setMyOrders([])
    setOrganizerOrders([])
    setOrganizerStats(null)
    setApplications([])
  }, [])

  const updateProfile = useCallback(async (name, email, pwd) => {
    if (!user) return null
    const payload = { data: { full_name: name } }
    if (email && email !== user.email) payload.email = email
    if (pwd) payload.password = pwd
    const { error } = await supabase.auth.updateUser(payload)
    if (error) { console.error('updateProfile:', error); return null }
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    const updated = { ...user, name, email: email || user.email }
    setUserState(updated)
    return updated
  }, [user])

  const applyForOrganizer = useCallback(async (reason) => {
    if (!user) return { ok: false, error: 'Non connecté' }
    const { error } = await supabase.from('organizer_applications').insert({ user_id: user.id, reason })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [user])

  // ── CART ───────────────────────────────────────────────────
  const addToCart = useCallback((event, selections) => {
    const items = Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [, tidx] = key.split('_')
        const t = event.tickets[+tidx]
        return {
          id:           'c' + Date.now() + Math.random(),
          eventId:      event.id,
          eventTitle:   event.title,
          ticketName:   t.name,
          ticketTypeId: t.id,
          price:        t.price,
          qty,
        }
      })
    if (!items.length) return false
    setCart([...cart, ...items])
    return true
  }, [cart, setCart])

  const removeFromCart = useCallback((id) => {
    setCart(cart.filter((i) => i.id !== id))
  }, [cart, setCart])

  const clearCart = useCallback(() => setCart([]), [setCart])

  // ── PURCHASE (simulation or PayDunya) ──────────────────────
  const purchase = useCallback(async (method, phone = '', discountAmount = 0) => {
    if (!user || !cart.length) return null

    const rawTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
    const total    = Math.max(0, rawTotal - discountAmount)

    if (PAYMENT_MODE === 'paydunya') {
      // ── PayDunya flow ──
      const returnUrl = `${window.location.origin}/?paydunya_return=1`
      const cancelUrl = `${window.location.origin}/?paydunya_cancel=1`

      const { data: pdData, error: pdError } = await supabase.functions.invoke('create-paydunya-payment', {
        body: { cart, total, userId: user.id, returnUrl, cancelUrl, method, phone },
      })

      if (pdError || pdData?.response_code !== '00') {
        console.error('PayDunya create error:', pdError || pdData)
        return null
      }

      // Pre-create pending order
      const orderId = crypto.randomUUID()
      const { error: orderError } = await supabase.from('orders').insert({
        id:             orderId,
        user_id:        user.id,
        total_cfa:      total,
        payment_method: method,
        payment_status: 'pending',
        paydunya_token: pdData.token,
      })
      if (orderError) { console.error('purchase pending order:', orderError); return null }

      // Save pending context
      sessionStorage.setItem('om_pending', JSON.stringify({
        type: 'purchase', orderId, token: pdData.token, cart: [...cart], total, userId: user.id,
      }))

      clearCart()
      return { redirect: pdData.description }
    }

    // ── Simulation flow ──
    const orderId = crypto.randomUUID()
    const { error: orderError } = await supabase.from('orders').insert({
      id:             orderId,
      user_id:        user.id,
      total_cfa:      total,
      payment_method: method,
      payment_status: 'paid',
    })
    if (orderError) { console.error('purchase order:', orderError); return null }

    const orderItems = cart.map((item) => ({
      order_id:       orderId,
      event_id:       item.eventId,
      ticket_type_id: item.ticketTypeId,
      quantity:       item.qty,
      unit_price_cfa: item.price,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) { console.error('purchase items:', itemsError); return null }

    for (const item of cart) {
      const ev = events.find((e) => e.id === item.eventId)
      const tk = ev?.tickets.find((t) => t.id === item.ticketTypeId)
      if (!tk) continue
      await supabase
        .from('ticket_types')
        .update({ quantity_sold: Math.min((tk.sold || 0) + item.qty, tk.total) })
        .eq('id', item.ticketTypeId)
    }

    clearCart()
    const freshEvents = await loadEvents()
    await loadMyOrders(user.id, freshEvents, user.name)

    // Email + push — fire-and-forget
    const cartSnap = [...cart]
    if (user.email) {
      supabase.functions.invoke('send-ticket-email', { body: { to: user.email, userName: user.name, orderId, items: cartSnap.map(i => ({ eventTitle: i.eventTitle, ticketName: i.ticketName, price: i.price, qty: i.qty })), total, method } }).catch(console.error)
    }
    supabase.from('push_subscriptions').select('endpoint,p256dh,auth_key').eq('user_id', user.id).then(({ data: subs }) => {
      for (const s of subs ?? []) {
        supabase.functions.invoke('send-push', { body: { subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, title: '🎉 Paiement confirmé !', body: `Vos ${cartSnap.reduce((n,i)=>n+i.qty,0)} billet(s) sont prêts.`, url: window.location.origin } }).catch(console.error)
      }
    })

    return { ok: true }
  }, [user, cart, events, clearCart, loadEvents, loadMyOrders])

  // ── VERIFY PAYDUNYA RETURN ─────────────────────────────────
  const verifyPaydunyaReturn = useCallback(async () => {
    const raw = sessionStorage.getItem('om_pending')
    if (!raw) return { cancelled: true }

    const pending = JSON.parse(raw)
    sessionStorage.removeItem('om_pending')

    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-paydunya-payment', {
      body: { token: pending.token },
    })

    if (verifyError || verifyData?.status !== 'completed') {
      await supabase.from('orders').delete().eq('id', pending.orderId)
      if (pending.type === 'resale' && pending.listingId) {
        await supabase.from('ticket_listings').update({ status: 'active', buyer_id: null }).eq('id', pending.listingId)
      }
      return { cancelled: true }
    }

    if (pending.type === 'resale') {
      // Complete resale purchase
      const buyerOrderId = pending.orderId
      const orderItems = [{
        order_id:       buyerOrderId,
        event_id:       pending.eventId,
        ticket_type_id: pending.ticketTypeId,
        quantity:       pending.quantity,
        unit_price_cfa: pending.askPrice,
        is_resale:      true,
      }]
      await supabase.from('order_items').insert(orderItems)
      await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', buyerOrderId)
      await supabase.from('order_items').update({ resold: true }).eq('id', pending.originalOrderItemId)
      await supabase.from('ticket_listings').update({
        status:        'sold',
        buyer_id:      pending.userId,
        buyer_order_id: buyerOrderId,
        sold_at:       new Date().toISOString(),
      }).eq('id', pending.listingId)
    } else {
      // Complete regular purchase
      const orderItems = pending.cart.map((item) => ({
        order_id:       pending.orderId,
        event_id:       item.eventId,
        ticket_type_id: item.ticketTypeId,
        quantity:       item.qty,
        unit_price_cfa: item.price,
      }))
      await supabase.from('order_items').insert(orderItems)
      await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', pending.orderId)

      for (const item of pending.cart) {
        const ev = events.find((e) => e.id === item.eventId)
        const tk = ev?.tickets.find((t) => t.id === item.ticketTypeId)
        if (!tk) continue
        await supabase
          .from('ticket_types')
          .update({ quantity_sold: Math.min((tk.sold || 0) + item.qty, tk.total) })
          .eq('id', item.ticketTypeId)
      }
    }

    const freshEvents = await loadEvents()
    const uid = pending.userId || user?.id
    if (uid) await loadMyOrders(uid, freshEvents, user?.name || '')
    await loadResaleListings()

    // Email + push after PayDunya verify — fire-and-forget
    if (pending.type !== 'resale' && user?.email) {
      supabase.functions.invoke('send-ticket-email', { body: { to: user.email, userName: user.name, orderId: pending.orderId, items: (pending.cart || []).map(i => ({ eventTitle: i.eventTitle, ticketName: i.ticketName, price: i.price, qty: i.qty })), total: pending.total, method: 'paydunya' } }).catch(console.error)
    }
    if (uid) {
      supabase.from('push_subscriptions').select('endpoint,p256dh,auth_key').eq('user_id', uid).then(({ data: subs }) => {
        for (const s of subs ?? []) {
          supabase.functions.invoke('send-push', { body: { subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } }, title: '🎉 Paiement confirmé !', body: `Vos billets sont prêts.`, url: window.location.origin } }).catch(console.error)
        }
      })
    }

    return { ok: true }
  }, [user, events, loadEvents, loadMyOrders, loadResaleListings])

  // ── RESALE: list a ticket ───────────────────────────────────
  const listTicketForResale = useCallback(async ({
    orderItemId, orderId, eventId, ticketTypeId,
    eventTitle, eventDate, eventCity, eventEmoji, eventImageUrl,
    ticketName, quantity, originalPrice, askPrice,
  }) => {
    if (!user?.id) return null

    // Check not already listed
    const { data: existing } = await supabase
      .from('ticket_listings')
      .select('id')
      .eq('order_item_id', orderItemId)
      .eq('status', 'active')
      .single()
    if (existing) return { error: 'Ce billet est déjà mis en vente.' }

    const { data, error } = await supabase
      .from('ticket_listings')
      .insert({
        seller_id:       user.id,
        order_id:        orderId,
        order_item_id:   orderItemId,
        event_id:        eventId,
        ticket_type_id:  ticketTypeId,
        event_title:     eventTitle,
        event_date:      eventDate,
        event_city:      eventCity  || '',
        event_emoji:     eventEmoji || '🎟️',
        event_image_url: eventImageUrl || null,
        ticket_name:     ticketName,
        quantity:        quantity || 1,
        original_price:  originalPrice || 0,
        ask_price_cfa:   askPrice,
      })
      .select()
      .single()

    if (error) { console.error('listTicketForResale:', error); return null }
    await loadResaleListings()
    await loadMyOrders(user.id, events, user.name)
    return data
  }, [user, events, loadResaleListings, loadMyOrders])

  // ── RESALE: cancel a listing ────────────────────────────────
  const cancelResaleListing = useCallback(async (listingId) => {
    const { error } = await supabase
      .from('ticket_listings')
      .update({ status: 'cancelled' })
      .eq('id', listingId)
      .eq('seller_id', user?.id)
    if (error) { console.error('cancelResaleListing:', error); return false }
    await loadResaleListings()
    await loadMyOrders(user?.id, events, user?.name)
    return true
  }, [user, events, loadResaleListings, loadMyOrders])

  // ── RESALE: buy a listing ───────────────────────────────────
  const buyResaleListing = useCallback(async (listing, method = 'simulation', phone = '') => {
    if (!user?.id) return null
    if (listing.seller_id === user.id) return { error: 'Vous ne pouvez pas acheter votre propre annonce.' }

    const fee    = Math.round(listing.ask_price_cfa * 0.10)
    const total  = listing.ask_price_cfa + fee
    const buyerOrderId = crypto.randomUUID()

    if (PAYMENT_MODE === 'paydunya') {
      const returnUrl = `${window.location.origin}/?paydunya_return=1`
      const cancelUrl = `${window.location.origin}/?paydunya_cancel=1`

      const fakeCart = [{
        eventTitle: listing.event_title,
        ticketName: `${listing.ticket_name} (revente)`,
        qty:        listing.quantity,
        price:      listing.ask_price_cfa + fee,
      }]

      const { data: pdData, error: pdError } = await supabase.functions.invoke('create-paydunya-payment', {
        body: { cart: fakeCart, total, userId: user.id, returnUrl, cancelUrl, method, phone },
      })

      if (pdError || pdData?.response_code !== '00') {
        console.error('PayDunya resale error:', pdError || pdData)
        return null
      }

      // Reserve listing
      await supabase.from('ticket_listings').update({ status: 'reserved', buyer_id: user.id }).eq('id', listing.id)

      // Pre-create pending order
      await supabase.from('orders').insert({
        id:             buyerOrderId,
        user_id:        user.id,
        total_cfa:      total,
        payment_method: method,
        payment_status: 'pending',
        paydunya_token: pdData.token,
      })

      sessionStorage.setItem('om_pending', JSON.stringify({
        type:              'resale',
        orderId:           buyerOrderId,
        token:             pdData.token,
        listingId:         listing.id,
        eventId:           listing.event_id,
        ticketTypeId:      listing.ticket_type_id,
        quantity:          listing.quantity,
        askPrice:          listing.ask_price_cfa,
        originalOrderItemId: listing.order_item_id,
        userId:            user.id,
      }))

      return { redirect: pdData.description }
    }

    // ── Simulation flow ──
    const { error: orderError } = await supabase.from('orders').insert({
      id:             buyerOrderId,
      user_id:        user.id,
      total_cfa:      total,
      payment_method: method || 'simulation',
      payment_status: 'paid',
    })
    if (orderError) { console.error('buyResale order:', orderError); return null }

    const { error: itemError } = await supabase.from('order_items').insert({
      order_id:       buyerOrderId,
      event_id:       listing.event_id,
      ticket_type_id: listing.ticket_type_id,
      quantity:       listing.quantity,
      unit_price_cfa: listing.ask_price_cfa,
      is_resale:      true,
    })
    if (itemError) { console.error('buyResale item:', itemError); return null }

    // Mark original item as resold
    await supabase.from('order_items').update({ resold: true }).eq('id', listing.order_item_id)

    // Mark listing as sold
    await supabase.from('ticket_listings').update({
      status:         'sold',
      buyer_id:       user.id,
      buyer_order_id: buyerOrderId,
      sold_at:        new Date().toISOString(),
    }).eq('id', listing.id)

    await loadResaleListings()
    const freshEvents = await loadEvents()
    await loadMyOrders(user.id, freshEvents, user.name)

    return { ok: true }
  }, [user, events, loadResaleListings, loadEvents, loadMyOrders])

  // ── FAVORITES ──────────────────────────────────────────────
  const toggleFavorite = useCallback(async (eventId) => {
    if (!user?.id) return false
    const isFav = favorites.includes(eventId)
    if (isFav) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('event_id', eventId)
      if (error) { console.error('toggleFavorite remove:', error); return false }
      setFavoritesState(favorites.filter((f) => f !== eventId))
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, event_id: eventId })
      if (error) { console.error('toggleFavorite add:', error); return false }
      setFavoritesState([...favorites, eventId])
    }
    return true
  }, [user, favorites])

  // ── EVENT MANAGEMENT ───────────────────────────────────────
  const createEvent = useCallback(async (ev) => {
    if (!user?.id) return null

    const { data: created, error } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        title:        ev.title,
        description:  ev.desc || '',
        city:         ev.city || '',
        venue:        ev.location || '',
        category:     ev.category || '',
        event_date:   `${ev.date}T${ev.time || '20:00'}:00`,
        emoji:        ev.emoji || '🎟️',
        image_url:    ev.imageUrl || null,
        status:       'published',
      })
      .select()
      .single()

    if (error) { console.error('createEvent:', error); return null }

    if (ev.tickets?.length) {
      const { error: tkErr } = await supabase.from('ticket_types').insert(
        ev.tickets.map((t) => ({
          event_id:       created.id,
          name:           t.name,
          price_cfa:      t.price,
          quantity_total: t.total,
          quantity_sold:  0,
        }))
      )
      if (tkErr) { console.error('createEvent tickets:', tkErr); return null }
    }

    const freshEvents = await loadEvents()
    if (userRole === 'organizer' || userRole === 'admin') {
      await loadOrganizerStats(user.id)
      await loadOrganizerOrders(user.id, freshEvents)
    }
    return created
  }, [user, userRole, loadEvents, loadOrganizerStats, loadOrganizerOrders])

  const deleteEvent = useCallback(async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { console.error('deleteEvent:', error); return false }
    const freshEvents = await loadEvents()
    if (userRole === 'organizer' || userRole === 'admin') {
      await loadOrganizerOrders(user?.id, freshEvents)
      await loadOrganizerStats(user?.id)
    }
    return true
  }, [user, userRole, loadEvents, loadOrganizerOrders, loadOrganizerStats])

  const updateEvent = useCallback(async (eventId, ev) => {
    const { error } = await supabase
      .from('events')
      .update({
        title:       ev.title,
        description: ev.desc,
        city:        ev.city,
        venue:       ev.location,
        category:    ev.category,
        event_date:  `${ev.date}T${ev.time || '20:00'}:00`,
        emoji:       ev.emoji || '🎟️',
        image_url:   ev.imageUrl || null,
      })
      .eq('id', eventId)
    if (error) { console.error('updateEvent:', error); return false }
    await loadEvents()
    return true
  }, [loadEvents])

  // ── REFUND ORDER ───────────────────────────────────────────
  const refundOrder = useCallback(async (orderId) => {
    const { error } = await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', orderId)
    if (error) { console.error('refundOrder:', error); return false }

    const { data: items } = await supabase.from('order_items').select('ticket_type_id, quantity, is_resale').eq('order_id', orderId)
    for (const item of items || []) {
      if (item.is_resale) continue // resale tickets don't affect quantity_sold
      const tk = events.flatMap(e => e.tickets).find(t => t.id === item.ticket_type_id)
      if (!tk) continue
      await supabase.from('ticket_types')
        .update({ quantity_sold: Math.max(0, (tk.sold || 0) - item.quantity) })
        .eq('id', item.ticket_type_id)
    }

    await loadEvents()
    await loadOrganizerOrders(user?.id)
    return true
  }, [user, events, loadEvents, loadOrganizerOrders])

  // ── CHECK-IN ───────────────────────────────────────────────
  const checkinPurchase = useCallback(async (purchaseId, eventId = null) => {
    const order = organizerOrders.find((p) => p.id === purchaseId)
    if (!order) return false

    const relevantItems = eventId
      ? order.items.filter((i) => i.eventId === eventId && !i.resold)
      : order.items.filter((i) => !i.resold)

    if (!relevantItems.length) return false

    const shouldCheckIn = !relevantItems.every((i) => i.checkedIn)
    const ids = relevantItems.map((i) => i.id)

    const { error } = await supabase.from('order_items').update({
      checked_in:    shouldCheckIn,
      checked_in_at: shouldCheckIn ? new Date().toISOString() : null,
      checked_in_by: user?.id,
    }).in('id', ids)

    if (error) { console.error('checkin:', error); return false }

    await loadOrganizerOrders(user?.id)
    await loadMyOrders(user?.id, undefined, user?.name)
    return true
  }, [organizerOrders, user, loadOrganizerOrders, loadMyOrders])

  // ── ADMIN ──────────────────────────────────────────────────
  const loadApplications = useCallback(async () => {
    const { data, error } = await supabase
      .from('organizer_applications')
      .select('id, user_id, reason, status, created_at, profiles:user_id (full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) { console.error('loadApplications:', error); return }
    setApplications(
      (data || []).map((a) => ({
        id:        a.id,
        userId:    a.user_id,
        userName:  a.profiles?.full_name || a.profiles?.email || 'Inconnu',
        userEmail: a.profiles?.email || '',
        reason:    a.reason,
        status:    a.status,
        date:      a.created_at,
      }))
    )
  }, [])

  const promoteToOrganizer = useCallback(async (targetUserId, applicationId) => {
    const { error } = await supabase.rpc('promote_to_organizer', { target_user_id: targetUserId })
    if (error) { console.error('promoteToOrganizer:', error); return false }
    if (applicationId) {
      await supabase.from('organizer_applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', applicationId)
    }
    await loadApplications()
    return true
  }, [user, loadApplications])

  const rejectApplication = useCallback(async (applicationId) => {
    const { error } = await supabase.from('organizer_applications')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq('id', applicationId)
    if (error) { console.error('rejectApplication:', error); return false }
    await loadApplications()
    return true
  }, [user, loadApplications])

  // ── UPLOAD EVENT IMAGE ─────────────────────────────────────
  const uploadEventImage = useCallback(async (file) => {
    if (!user?.id || !file) return null
    const ext  = file.name.split('.').pop().toLowerCase()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('event-images')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('uploadEventImage:', error); return null }
    const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(path)
    return publicUrl
  }, [user])

  // ── PUSH SUBSCRIPTIONS ─────────────────────────────────────
  const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

  const subscribePush = useCallback(async () => {
    if (!user?.id || !VAPID_PUBLIC) return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    try {
      const reg = await navigator.serviceWorker.ready
      let sub   = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: VAPID_PUBLIC,
        })
      }
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id:  user.id,
        endpoint: j.endpoint,
        p256dh:   j.keys.p256dh,
        auth_key: j.keys.auth,
      }, { onConflict: 'user_id,endpoint' })
      return !error
    } catch (e) { console.error('subscribePush:', e); return false }
  }, [user, VAPID_PUBLIC])

  const unsubscribePush = useCallback(async () => {
    if (!user?.id || !('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', user.id).eq('endpoint', sub.endpoint)
      }
    } catch (e) { console.error('unsubscribePush:', e) }
  }, [user])

  // ── REFRESH ────────────────────────────────────────────────
  const refreshOrganizerData = useCallback(async () => {
    if (!user?.id) return
    await loadOrganizerOrders(user.id)
    await loadOrganizerStats(user.id)
  }, [user, loadOrganizerOrders, loadOrganizerStats])

  // ── DERIVED ────────────────────────────────────────────────
  const cartCount   = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal   = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const myEvents    = events.filter((e) => e.organizer === user?.id)
  const isOrganizer = userRole === 'organizer' || userRole === 'admin'
  const isAdmin     = userRole === 'admin'

  return {
    user, userRole, isOrganizer, isAdmin,
    events, cart, favorites,
    myPurchases:    myOrders,
    organizerOrders,
    organizerStats,
    purchases:      organizerOrders,
    myOrders,
    myEvents,
    cartCount, cartTotal,
    loading, errors,
    resaleListings,

    login, signup, googleLogin, logout, updateProfile,
    applyForOrganizer,

    addToCart, removeFromCart, clearCart,

    purchase,
    verifyPaydunyaReturn,

    toggleFavorite,

    createEvent, updateEvent, deleteEvent,

    listTicketForResale,
    cancelResaleListing,
    buyResaleListing,
    loadResaleListings,

    checkinPurchase, refundOrder,

    applications,
    loadApplications,
    promoteToOrganizer,
    rejectApplication,

    uploadEventImage,
    subscribePush,
    unsubscribePush,

    refreshOrganizerData,
    loadEvents,
    loadOrganizerStats,
  }
}
