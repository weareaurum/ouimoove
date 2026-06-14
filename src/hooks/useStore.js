import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_EVENTS } from '../data/events.js'
import { supabase } from '../lib/supabase.js'

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

  // Granular loading + error state
  const [loading, setLoading] = useState({
    events: true, orders: false, orgOrders: false, stats: false,
  })
  const [errors, setErrors] = useState({
    events: null, orders: null, orgOrders: null, stats: null,
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
        order_items (id, event_id, ticket_type_id, quantity, unit_price_cfa, checked_in)
      `)
      .eq('user_id', userId)
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

  // ── LOAD ORGANIZER ORDERS (real attendee names + emails) ───
  // Queries the organizer_attendees view which joins profiles → real name/email
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

    // organizer_attendees view: one row per order_item, with real attendee info
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

    // Group rows by order_id → one entry per order with real attendee info
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
          status:    row.payment_status,
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
      })
      grouped[row.order_id].total += row.unit_price_cfa * row.quantity
    }

    setOrganizerOrders(Object.values(grouped))
  }, [events])

  // ── LOAD ORGANIZER STATS (from Supabase RPC) ───────────────
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
    // Load events immediately
    loadEvents()

    // Restore session
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u) {
        const profile = {
          id:    u.id,
          name:  u.user_metadata?.full_name || u.email,
          email: u.email,
        }
        setUserState(profile)
        loadUserRole(u.id)
        loadFavorites(u.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user
      if (u) {
        const profile = {
          id:    u.id,
          name:  u.user_metadata?.full_name || u.email,
          email: u.email,
        }
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

  // Load user-specific data once we have both user + events
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

    // No session = email confirmation required
    if (!data.session) {
      return { ok: true, user: profile, needsEmailConfirmation: true }
    }

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

    // Sync profiles table
    await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', user.id)

    const updated = { ...user, name, email: email || user.email }
    setUserState(updated)
    return updated
  }, [user])

  // Apply to become an organizer
  const applyForOrganizer = useCallback(async (reason) => {
    if (!user) return { ok: false, error: 'Non connecté' }
    const { error } = await supabase
      .from('organizer_applications')
      .insert({ user_id: user.id, reason })
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

  // ── PURCHASE ───────────────────────────────────────────────
  const purchase = useCallback(async (method, phone = '') => {
    if (!user || !cart.length) return null

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
    const orderId = crypto.randomUUID()

    // Create paid order directly
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id:             orderId,
        user_id:        user.id,
        total_cfa:      total,
        payment_method: method,
        payment_status: 'paid',
      })

    if (orderError) { console.error('purchase order:', orderError); return null }

    // Create order items
    const orderItems = cart.map((item) => ({
      order_id:       orderId,
      event_id:       item.eventId,
      ticket_type_id: item.ticketTypeId,
      quantity:       item.qty,
      unit_price_cfa: item.price,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) { console.error('purchase items:', itemsError); return null }

    // Update ticket sold counts
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

    return { ok: true }
  }, [user, cart, events, clearCart, loadEvents, loadMyOrders])

  // ── FAVORITES ──────────────────────────────────────────────
  const toggleFavorite = useCallback(async (eventId) => {
    if (!user?.id) return false

    const isFav = favorites.includes(eventId)

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId)
      if (error) { console.error('toggleFavorite remove:', error); return false }
      setFavoritesState(favorites.filter((f) => f !== eventId))
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, event_id: eventId })
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
      const { error: tkErr } = await supabase
        .from('ticket_types')
        .insert(
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

  // ── CHECK-IN ───────────────────────────────────────────────
  const checkinPurchase = useCallback(async (purchaseId, eventId = null) => {
    const order = organizerOrders.find((p) => p.id === purchaseId)
    if (!order) return false

    const relevantItems = eventId
      ? order.items.filter((i) => i.eventId === eventId)
      : order.items

    if (!relevantItems.length) return false

    const shouldCheckIn = !relevantItems.every((i) => i.checkedIn)
    const ids = relevantItems.map((i) => i.id)

    const { error } = await supabase
      .from('order_items')
      .update({
        checked_in:    shouldCheckIn,
        checked_in_at: shouldCheckIn ? new Date().toISOString() : null,
        checked_in_by: user?.id,
      })
      .in('id', ids)

    if (error) { console.error('checkin:', error); return false }

    // Refresh organizer orders to show updated state
    await loadOrganizerOrders(user?.id)
    // Also refresh my orders so the buyer sees updated state
    await loadMyOrders(user?.id, undefined, user?.name)
    return true
  }, [organizerOrders, user, loadOrganizerOrders, loadMyOrders])

  // ── ADMIN: load organizer applications ────────────────────
  const loadApplications = useCallback(async () => {
    const { data, error } = await supabase
      .from('organizer_applications')
      .select(`
        id, user_id, reason, status, created_at,
        profiles:user_id (full_name, email)
      `)
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

  // ── ADMIN: promote a user to organizer ────────────────────
  const promoteToOrganizer = useCallback(async (targetUserId, applicationId) => {
    const { error } = await supabase.rpc('promote_to_organizer', {
      target_user_id: targetUserId,
    })
    if (error) { console.error('promoteToOrganizer:', error); return false }

    // Mark application as approved
    if (applicationId) {
      await supabase
        .from('organizer_applications')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
        .eq('id', applicationId)
    }

    await loadApplications()
    return true
  }, [user, loadApplications])

  // ── ADMIN: reject an application ──────────────────────────
  const rejectApplication = useCallback(async (applicationId) => {
    const { error } = await supabase
      .from('organizer_applications')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .eq('id', applicationId)
    if (error) { console.error('rejectApplication:', error); return false }
    await loadApplications()
    return true
  }, [user, loadApplications])

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
    // state
    user, userRole, isOrganizer, isAdmin,
    events, cart, favorites,
    myPurchases:    myOrders,
    organizerOrders,
    organizerStats,
    purchases:      organizerOrders, // alias used by OrganizerModal
    myOrders,
    myEvents,
    cartCount, cartTotal,
    loading, errors,

    // auth
    login, signup, googleLogin, logout, updateProfile,
    applyForOrganizer,

    // cart
    addToCart, removeFromCart, clearCart,

    // purchase
    purchase,

    // favorites
    toggleFavorite,

    // events
    createEvent, deleteEvent,

    // check-in
    checkinPurchase,

    // admin
    applications,
    loadApplications,
    promoteToOrganizer,
    rejectApplication,

    // refresh
    refreshOrganizerData,
    loadEvents,
    loadOrganizerStats,
  }
}
