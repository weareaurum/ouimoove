import { useState, useCallback } from 'react'
import { DEFAULT_EVENTS } from '../data/events.js'

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

function persist(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export function useStore() {
  const [user,      setUserState]      = useState(null)
  const [users,     setUsersState]     = useState(() => load('om_users', []))
  const [events,    setEventsState]    = useState(() => load('om_events', DEFAULT_EVENTS))
  const [cart,      setCartState]      = useState(() => load('om_cart', []))
  const [purchases, setPurchasesState] = useState(() => load('om_purchases', []))
  const [favorites, setFavoritesState] = useState(() => load('om_favorites', []))

  /* helpers that both set state AND persist */
  const setUsers = useCallback(v => {
    setUsersState(v); persist('om_users', v)
  }, [])
  const setEvents = useCallback(v => {
    setEventsState(v); persist('om_events', v)
  }, [])
  const setCart = useCallback(v => {
    setCartState(v); persist('om_cart', v)
  }, [])
  const setPurchases = useCallback(v => {
    setPurchasesState(v); persist('om_purchases', v)
  }, [])
  const setFavorites = useCallback(v => {
    setFavoritesState(v); persist('om_favorites', v)
  }, [])

  /* ── AUTH ── */
  const login = useCallback((email, password) => {
    const u = users.find(u => u.email === email && u.pwd === password)
    if (!u) return { ok: false, error: 'Email ou mot de passe incorrect.' }
    setUserState(u)
    return { ok: true, user: u }
  }, [users])

  const signup = useCallback((name, email, password) => {
    if (!name || !email || !password) return { ok: false, error: 'Tous les champs sont requis.' }
    if (password.length < 6) return { ok: false, error: 'Mot de passe trop court (6 car. min).' }
    if (users.find(u => u.email === email)) return { ok: false, error: 'Cet email est déjà utilisé.' }
    const u = { id: 'u' + Date.now(), name, email, pwd: password }
    const next = [...users, u]
    setUsers(next)
    setUserState(u)
    return { ok: true, user: u }
  }, [users, setUsers])

  const googleLogin = useCallback(() => {
    const existing = users.find(u => u.email === 'google@gmail.com')
    const u = existing ?? { id: 'ug' + Date.now(), name: 'Utilisateur Google', email: 'google@gmail.com', pwd: '', isGoogle: true }
    if (!existing) setUsers([...users, u])
    setUserState(u)
    return u
  }, [users, setUsers])

  const logout = useCallback(() => setUserState(null), [])

  const updateProfile = useCallback((name, email, pwd) => {
    const next = users.map(u =>
      u.id === user.id ? { ...u, name, email, ...(pwd ? { pwd } : {}) } : u
    )
    setUsers(next)
    const updated = next.find(u => u.id === user.id)
    setUserState(updated)
    return updated
  }, [users, user, setUsers])

  /* ── CART ── */
  const addToCart = useCallback((event, selections) => {
    const items = Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [, tidx] = key.split('_')
        const t = event.tickets[+tidx]
        return { id: 'c' + Date.now() + Math.random(), eventId: event.id, eventTitle: event.title, ticketName: t.name, price: t.price, qty }
      })
    if (!items.length) return false
    setCart([...cart, ...items])
    return true
  }, [cart, setCart])

  const removeFromCart = useCallback(id => {
    setCart(cart.filter(i => i.id !== id))
  }, [cart, setCart])

  const clearCart = useCallback(() => setCart([]), [setCart])

  /* ── PURCHASE ── */
  const purchase = useCallback((method) => {
    if (!user || !cart.length) return
    const p = {
      id:      'p' + Date.now(),
      userId:  user.id,
      userName: user.name,
      date:    new Date().toISOString(),
      items:   [...cart],
      total:   cart.reduce((s, i) => s + i.price * i.qty, 0),
      method,
    }
    // update sold counts
    const nextEvents = events.map(e => ({
      ...e,
      tickets: e.tickets.map(t => {
        const bought = cart.filter(c => c.eventId === e.id && c.ticketName === t.name).reduce((s, c) => s + c.qty, 0)
        return bought ? { ...t, sold: Math.min(t.sold + bought, t.total) } : t
      }),
    }))
    setEvents(nextEvents)
    setPurchases([...purchases, p])
    clearCart()
    return p
  }, [user, cart, events, purchases, setEvents, setPurchases, clearCart])

  /* ── FAVORITES ── */
  const toggleFavorite = useCallback(eventId => {
    setFavorites(
      favorites.includes(eventId) ? favorites.filter(f => f !== eventId) : [...favorites, eventId]
    )
  }, [favorites, setFavorites])

  /* ── EVENTS (organizer) ── */
  const createEvent = useCallback(ev => {
    const next = [...events, { ...ev, id: 'ev' + Date.now(), organizer: user?.id }]
    setEvents(next)
  }, [events, user, setEvents])

  const deleteEvent = useCallback(id => {
    setEvents(events.filter(e => e.id !== id))
  }, [events, setEvents])

  const checkinPurchase = useCallback(purchaseId => {
    setPurchases(purchases.map(p => p.id === purchaseId ? { ...p, checkedIn: !p.checkedIn } : p))
  }, [purchases, setPurchases])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const myPurchases = purchases.filter(p => p.userId === user?.id)
  const myEvents = events.filter(e => e.organizer === user?.id)

  return {
    user, users, events, cart, purchases, favorites,
    cartCount, cartTotal, myPurchases, myEvents,
    login, signup, googleLogin, logout, updateProfile,
    addToCart, removeFromCart, clearCart,
    purchase,
    toggleFavorite,
    createEvent, deleteEvent, checkinPurchase,
  }
}
