import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_EVENTS } from '../data/events.js'
import { supabase } from '../lib/supabase.js'

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function persist(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function useStore() {
  const [user, setUserState] = useState(null)
  const [users, setUsersState] = useState(() => load('om_users', []))
  const [events, setEventsState] = useState([])
  const [cart, setCartState] = useState(() => load('om_cart', []))
  const [myOrders, setMyOrdersState] = useState([])
  const [organizerOrders, setOrganizerOrdersState] = useState([])
  const [favorites, setFavoritesState] = useState([])

  const loadEventsFromSupabase = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        city,
        venue,
        category,
        event_date,
        status,
        organizer_id,
        ticket_types (
          id,
          name,
          price_cfa,
          quantity_total,
          quantity_sold
        )
      `)
      .eq('status', 'published')
      .order('event_date', { ascending: true })

    if (error) {
      console.error('Error loading events:', JSON.stringify(error, null, 2))
      setEventsState(DEFAULT_EVENTS)
      return
    }

    const formattedEvents = (data || []).map((event) => {
      const eventDate = new Date(event.event_date)

      return {
        id: event.id,
        title: event.title,
        category: event.category || '',
        date: eventDate.toISOString().slice(0, 10),
        time: eventDate.toISOString().slice(11, 16),
        location: event.venue || '',
        city: event.city || '',
        desc: event.description || '',
        emoji: '🎟️',
        tickets: (event.ticket_types || []).map((ticket) => ({
          id: ticket.id,
          name: ticket.name,
          price: ticket.price_cfa,
          total: ticket.quantity_total,
          sold: ticket.quantity_sold,
        })),
        organizer: event.organizer_id,
      }
    })

    setEventsState(formattedEvents)
  }, [])

  const loadFavoritesFromSupabase = useCallback(async (userId) => {
    if (!userId) return

    const { data, error } = await supabase
      .from('favorites')
      .select('event_id')
      .eq('user_id', userId)

    if (error) {
      console.error('Error loading favorites:', JSON.stringify(error, null, 2))
      return
    }

    setFavoritesState((data || []).map((f) => f.event_id))
  }, [])

  const loadMyOrdersFromSupabase = useCallback(async (userId) => {
    if (!userId) return

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_cfa,
        payment_method,
        payment_status,
        created_at,
        order_items (
          id,
          event_id,
          ticket_type_id,
          quantity,
          unit_price_cfa,
          checked_in
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading my orders:', JSON.stringify(error, null, 2))
      return
    }

    const formatted = (data || []).map((order) => {
      const items = (order.order_items || []).map((item) => {
        const event = events.find((e) => e.id === item.event_id)
        const ticket = event?.tickets.find((t) => t.id === item.ticket_type_id)

        return {
          id: item.id,
          eventId: item.event_id,
          eventTitle: event?.title || 'Événement',
          ticketName: ticket?.name || 'Billet',
          price: item.unit_price_cfa,
          qty: item.quantity,
          checkedIn: item.checked_in,
        }
      })

      return {
        id: order.id,
        userId: order.user_id,
        userName: user?.name || '',
        date: order.created_at,
        items,
        total: order.total_cfa,
        method: order.payment_method,
        status: order.payment_status,
      }
    })

    setMyOrdersState(formatted)
  }, [events, user])

  const loadOrganizerOrdersFromSupabase = useCallback(async (organizerId) => {
    if (!organizerId) return

    const myEventIds = events.filter((e) => e.organizer === organizerId).map((e) => e.id)

    if (!myEventIds.length) {
      setOrganizerOrdersState([])
      return
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        event_id,
        ticket_type_id,
        quantity,
        unit_price_cfa,
        checked_in
      `)
      .in('event_id', myEventIds)

    if (itemsError) {
      console.error('Error loading organizer order items:', JSON.stringify(itemsError, null, 2))
      return
    }

    const orderIds = [...new Set((itemsData || []).map((i) => i.order_id))]
    if (!orderIds.length) {
      setOrganizerOrdersState([])
      return
    }

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total_cfa,
        payment_method,
        payment_status,
        created_at
      `)
      .in('id', orderIds)

    if (ordersError) {
      console.error('Error loading organizer orders:', JSON.stringify(ordersError, null, 2))
      return
    }

    const ordersMap = new Map((ordersData || []).map((o) => [o.id, o]))

    const grouped = {}
    for (const item of itemsData || []) {
      if (!grouped[item.order_id]) grouped[item.order_id] = []
      grouped[item.order_id].push(item)
    }

    const formatted = Object.values(
      Object.fromEntries(
        Object.entries(grouped).map(([orderId, items]) => {
          const order = ordersMap.get(orderId)
          if (!order) return [orderId, null]

          const mappedItems = items.map((item) => {
            const event = events.find((e) => e.id === item.event_id)
            const ticket = event?.tickets.find((t) => t.id === item.ticket_type_id)

            return {
              id: item.id,
              eventId: item.event_id,
              eventTitle: event?.title || 'Événement',
              ticketName: ticket?.name || 'Billet',
              price: item.unit_price_cfa,
              qty: item.quantity,
              checkedIn: item.checked_in,
            }
          })

          return [orderId, {
            id: order.id,
            userId: order.user_id,
            userName: `Client ${String(order.user_id).slice(0, 6)}`,
            date: order.created_at,
            items: mappedItems,
            total: order.total_cfa,
            method: order.payment_method,
            status: order.payment_status,
          }]
        })
      )
    ).filter(Boolean)

    setOrganizerOrdersState(formatted)
  }, [events])

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error loading session:', JSON.stringify(error, null, 2))
        return
      }

      const authUser = data.session?.user
      if (authUser) {
        setUserState({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email,
          email: authUser.email,
        })
      } else {
        setUserState(null)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user
      if (authUser) {
        setUserState({
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email,
          email: authUser.email,
        })
      } else {
        setUserState(null)
        setFavoritesState([])
        setMyOrdersState([])
        setOrganizerOrdersState([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadEventsFromSupabase()
  }, [loadEventsFromSupabase])

  useEffect(() => {
    if (user?.id) {
      loadFavoritesFromSupabase(user.id)
      loadMyOrdersFromSupabase(user.id)
      loadOrganizerOrdersFromSupabase(user.id)
    } else {
      setFavoritesState([])
      setMyOrdersState([])
      setOrganizerOrdersState([])
    }
  }, [user, events, loadFavoritesFromSupabase, loadMyOrdersFromSupabase, loadOrganizerOrdersFromSupabase])

  const setUsers = useCallback((v) => {
    setUsersState(v)
    persist('om_users', v)
  }, [])

  const setCart = useCallback((v) => {
    setCartState(v)
    persist('om_cart', v)
  }, [])

  const login = useCallback(async (email, password) => {
    if (!email || !password) {
      return { ok: false, error: 'Email et mot de passe requis.' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }

    const authUser = data.user
    const userProfile = {
      id: authUser.id,
      name: authUser.user_metadata?.full_name || authUser.email,
      email: authUser.email,
    }

    setUserState(userProfile)
    await loadFavoritesFromSupabase(authUser.id)
    await loadMyOrdersFromSupabase(authUser.id)
    await loadOrganizerOrdersFromSupabase(authUser.id)

    return { ok: true, user: userProfile }
  }, [loadFavoritesFromSupabase, loadMyOrdersFromSupabase, loadOrganizerOrdersFromSupabase])

  const signup = useCallback(async (name, email, password) => {
    if (!name || !email || !password) {
      return { ok: false, error: 'Tous les champs sont requis.' }
    }
    if (password.length < 6) {
      return { ok: false, error: 'Mot de passe trop court (6 car. min).' }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) return { ok: false, error: error.message }

    const authUser = data.user
    const session = data.session
    if (!authUser) {
      return { ok: false, error: 'Création du compte impossible.' }
    }

    const userProfile = {
      id: authUser.id,
      name,
      email: authUser.email,
    }

    setUserState(userProfile)

    if (!session) {
      return { ok: true, user: userProfile, needsEmailConfirmation: true }
    }

    await loadFavoritesFromSupabase(authUser.id)
    await loadMyOrdersFromSupabase(authUser.id)
    await loadOrganizerOrdersFromSupabase(authUser.id)

    return { ok: true, user: userProfile }
  }, [loadFavoritesFromSupabase, loadMyOrdersFromSupabase, loadOrganizerOrdersFromSupabase])

  const googleLogin = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUserState(null)
    setFavoritesState([])
    setMyOrdersState([])
    setOrganizerOrdersState([])
  }, [])

  const updateProfile = useCallback(async (name, email, pwd) => {
    if (!user) return null

    const updatePayload = { data: { full_name: name } }
    if (email && email !== user.email) updatePayload.email = email
    if (pwd) updatePayload.password = pwd

    const { error } = await supabase.auth.updateUser(updatePayload)
    if (error) {
      console.error('Error updating profile:', JSON.stringify(error, null, 2))
      return null
    }

    const updated = { ...user, name, email: email || user.email }
    setUserState(updated)
    return updated
  }, [user])

  const addToCart = useCallback((event, selections) => {
    const items = Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [, tidx] = key.split('_')
        const t = event.tickets[+tidx]
        return {
          id: 'c' + Date.now() + Math.random(),
          eventId: event.id,
          eventTitle: event.title,
          ticketName: t.name,
          price: t.price,
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

  const purchase = useCallback(async (method) => {
    if (!user || !cart.length) return null

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_cfa: total,
        payment_method: method,
        payment_status: 'paid',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', JSON.stringify(orderError, null, 2))
      return null
    }

    const orderId = orderData.id

    const orderItems = cart.map((item) => {
      const event = events.find((e) => e.id === item.eventId)
      const ticket = event?.tickets.find((t) => t.name === item.ticketName)

      return {
        order_id: orderId,
        event_id: item.eventId,
        ticket_type_id: ticket?.id,
        quantity: item.qty,
        unit_price_cfa: item.price,
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', JSON.stringify(itemsError, null, 2))
      return null
    }

    for (const item of orderItems) {
      const event = events.find((e) => e.id === item.event_id)
      const ticket = event?.tickets.find((t) => t.id === item.ticket_type_id)
      if (!ticket) continue

      const newSold = Math.min((ticket.sold || 0) + item.quantity, ticket.total || 0)

      const { error: stockError } = await supabase
        .from('ticket_types')
        .update({ quantity_sold: newSold })
        .eq('id', item.ticket_type_id)

      if (stockError) {
        console.error('Error updating ticket stock:', JSON.stringify(stockError, null, 2))
        return null
      }
    }

    clearCart()
    await loadEventsFromSupabase()
    await loadMyOrdersFromSupabase(user.id)
    await loadOrganizerOrdersFromSupabase(user.id)

    return {
      id: orderId,
      userId: user.id,
      userName: user.name,
      date: orderData.created_at,
      items: [...cart],
      total,
      method,
      status: 'paid',
    }
  }, [user, cart, events, clearCart, loadEventsFromSupabase, loadMyOrdersFromSupabase, loadOrganizerOrdersFromSupabase])

  const toggleFavorite = useCallback(async (eventId) => {
    if (!user?.id) return false

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) return false

    const isFav = favorites.includes(eventId)

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId)

      if (error) {
        console.error('Error removing favorite:', JSON.stringify(error, null, 2))
        return false
      }

      setFavoritesState(favorites.filter((f) => f !== eventId))
      return true
    }

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        event_id: eventId,
      })

    if (error) {
      console.error('Error adding favorite:', JSON.stringify(error, null, 2))
      return false
    }

    setFavoritesState([...favorites, eventId])
    return true
  }, [user, favorites])

  const createEvent = useCallback(async (ev) => {
    if (!user?.id) return null

    const eventDate = `${ev.date}T${ev.time || '20:00'}:00`

    const { data: createdEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        title: ev.title,
        description: ev.desc || '',
        city: ev.city || '',
        venue: ev.location || '',
        category: ev.category || '',
        event_date: eventDate,
        image_url: null,
        status: 'published',
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', JSON.stringify(eventError, null, 2))
      return null
    }

    const ticketRows = (ev.tickets || []).map((ticket) => ({
      event_id: createdEvent.id,
      name: ticket.name,
      price_cfa: ticket.price,
      quantity_total: ticket.total,
      quantity_sold: 0,
    }))

    if (ticketRows.length) {
      const { error: ticketsError } = await supabase
        .from('ticket_types')
        .insert(ticketRows)

      if (ticketsError) {
        console.error('Error creating ticket types:', JSON.stringify(ticketsError, null, 2))
        return null
      }
    }

    await loadEventsFromSupabase()
    return createdEvent
  }, [user, loadEventsFromSupabase])

  const deleteEvent = useCallback(async (id) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting event:', JSON.stringify(error, null, 2))
      return false
    }

    await loadEventsFromSupabase()
    await loadOrganizerOrdersFromSupabase(user?.id)
    return true
  }, [loadEventsFromSupabase, loadOrganizerOrdersFromSupabase, user])

  const checkinPurchase = useCallback(async (purchaseId, eventId = null) => {
    const purchase = organizerOrders.find((p) => p.id === purchaseId)
    if (!purchase) return false

    const relevantItems = purchase.items.filter((item) =>
      eventId ? item.eventId === eventId : true
    )

    if (!relevantItems.length) return false

    const shouldCheckIn = !relevantItems.every((item) => item.checkedIn)
    const idsToUpdate = relevantItems.map((item) => item.id)

    const { error } = await supabase
      .from('order_items')
      .update({ checked_in: shouldCheckIn })
      .in('id', idsToUpdate)

    if (error) {
      console.error('Error updating check-in:', JSON.stringify(error, null, 2))
      return false
    }

    if (user?.id) {
      await loadOrganizerOrdersFromSupabase(user.id)
      await loadMyOrdersFromSupabase(user.id)
    }

    return true
  }, [organizerOrders, user, loadOrganizerOrdersFromSupabase, loadMyOrdersFromSupabase])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const myPurchases = myOrders
  const myEvents = events.filter((e) => e.organizer === user?.id)

  return {
    user,
    users,
    events,
    cart,
    purchases: organizerOrders,
    myOrders,
    organizerOrders,
    favorites,
    cartCount,
    cartTotal,
    myPurchases,
    myEvents,
    login,
    signup,
    googleLogin,
    logout,
    updateProfile,
    addToCart,
    removeFromCart,
    clearCart,
    purchase,
    toggleFavorite,
    createEvent,
    deleteEvent,
    checkinPurchase,
  }
}