import { useState, useEffect } from 'react'
import { useStore } from './hooks/useStore.js'
import { useToast } from './hooks/useToast.js'
import { Navbar } from './components/Navbar.jsx'
import { Hero } from './components/Hero.jsx'
import { EventGrid } from './components/EventGrid.jsx'
import { Toast } from './components/Toast.jsx'
import { AuthModal } from './components/modals/AuthModal.jsx'
import { EventDetailModal } from './components/modals/EventDetailModal.jsx'
import { CartModal } from './components/modals/CartModal.jsx'
import { CheckoutModal } from './components/modals/CheckoutModal.jsx'
import { MyTicketsModal } from './components/modals/MyTicketsModal.jsx'
import { FavoritesModal } from './components/modals/FavoritesModal.jsx'
import { ProfileModal } from './components/modals/ProfileModal.jsx'
import { OrganizerModal } from './components/modals/OrganizerModal.jsx'
import { supabase } from './lib/supabase'

function App() {
  const store = useStore()
  const { toasts, toast } = useToast()

  const [modal, setModal] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Supabase client:', supabase)
  }, [])

  const open = (m) => setModal(m)
  const close = () => setModal(null)

  const goHome = () => {
    close()
    setSelectedEventId(null)
    setSearch('')
    setFilterCity('')
    setFilterCategory('')
    setSortBy('date')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEvent = (id) => {
    setSelectedEventId(id)
    open('event')
  }

  const requireAuth = (then) => {
    if (!store.user) {
      open('login')
      return false
    }
    then()
    return true
  }

  const handleAddToCart = (event, selections) => {
    const ok = store.addToCart(event, selections)
    if (!ok) {
      toast('Sélectionnez au moins 1 billet', 'error')
      return
    }
    toast('Billets ajoutés au panier !', 'success')
    close()
  }

  const handlePurchase = async (method) => {
    const result = await store.purchase(method)

    if (!result) {
      toast('Paiement impossible. Réessayez.', 'error')
      return
    }

    close()
    toast('🎉 Paiement confirmé ! Vos billets sont disponibles.', 'success')
  }

  const handleToggleFav = async (eventId) => {
    if (!requireAuth(() => {})) return
    const wasFav = store.favorites.includes(eventId)
    const ok = await store.toggleFavorite(eventId)

    if (!ok) {
      toast('Impossible de mettre à jour les favoris', 'error')
      return
    }

    toast(
      wasFav ? 'Retiré des favoris' : 'Ajouté aux favoris ❤️',
      wasFav ? 'info' : 'success'
    )
  }

  const selectedEvent = store.events.find((e) => e.id === selectedEventId)

  return (
    <>
      <Navbar
        user={store.user}
        cartCount={store.cartCount}
        onHome={goHome}
        onLogin={() => open('login')}
        onSignup={() => open('signup')}
        onCart={() => open('cart')}
        onTickets={() => requireAuth(() => open('tickets'))}
        onFavorites={() => requireAuth(() => open('favorites'))}
        onProfile={() => requireAuth(() => open('profile'))}
        onOrganizer={() => requireAuth(() => open('organizer'))}
        onLogout={async () => {
          await store.logout()
          toast('À bientôt !', 'info')
        }}
      />

      <Hero
        search={search}
        setSearch={setSearch}
        filterCity={filterCity}
        setFilterCity={setFilterCity}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <EventGrid
        events={store.events}
        favorites={store.favorites}
        search={search}
        filterCity={filterCity}
        filterCategory={filterCategory}
        sortBy={sortBy}
        onOpenEvent={openEvent}
        onToggleFav={handleToggleFav}
      />

      <AuthModal
        mode={modal === 'login' ? 'login' : modal === 'signup' ? 'signup' : null}
        onClose={close}
        onSwitch={(m) => open(m)}
        onLogin={async (email, pwd) => {
          const r = await store.login(email, pwd)
          if (!r.ok) return r.error
          toast('Bienvenue, ' + r.user.name + ' !', 'success')
          close()
          return null
        }}
        onSignup={async (name, email, pwd) => {
          const r = await store.signup(name, email, pwd)
          if (!r.ok) return r.error
          toast('Compte créé ! Bienvenue ' + r.user.name, 'success')
          close()
          return null
        }}
        onGoogle={async () => {
          try {
            await store.googleLogin()
          } catch (error) {
            toast(error.message || 'Connexion Google impossible', 'error')
          }
        }}
      />

      <EventDetailModal
        open={modal === 'event'}
        event={selectedEvent}
        onClose={close}
        onAddToCart={(selections) => {
          requireAuth(() => handleAddToCart(selectedEvent, selections))
        }}
      />

      <CartModal
        open={modal === 'cart'}
        cart={store.cart}
        cartTotal={store.cartTotal}
        onClose={close}
        onRemove={(id) => {
          store.removeFromCart(id)
          toast('Retiré du panier', 'info')
        }}
        onCheckout={() => open('checkout')}
      />

      <CheckoutModal
        open={modal === 'checkout'}
        cart={store.cart}
        cartTotal={store.cartTotal}
        onClose={close}
        onConfirm={handlePurchase}
      />

      <MyTicketsModal
        open={modal === 'tickets'}
        purchases={store.myPurchases}
        onClose={close}
        toast={toast}
      />

      <FavoritesModal
        open={modal === 'favorites'}
        events={store.events}
        favorites={store.favorites}
        onClose={close}
        onOpenEvent={openEvent}
        onToggleFav={handleToggleFav}
      />

      <ProfileModal
        open={modal === 'profile'}
        user={store.user}
        onClose={close}
        onSave={async (name, email, pwd) => {
          const updated = await store.updateProfile(name, email, pwd)
          if (!updated) {
            toast('Impossible de mettre à jour le profil', 'error')
            return
          }
          toast('Profil mis à jour', 'success')
          close()
        }}
        onLogout={async () => {
          await store.logout()
          toast('À bientôt !', 'info')
          close()
        }}
      />

      <OrganizerModal
        open={modal === 'organizer'}
        user={store.user}
        myEvents={store.myEvents}
        purchases={store.purchases}
        onClose={close}
        onCreate={async (ev) => {
          const created = await store.createEvent(ev)
          if (!created) {
            toast("Impossible de publier l'événement", 'error')
            return
          }
          toast('Événement publié ! 🎉', 'success')
        }}
        onDelete={async (id) => {
          const ok = await store.deleteEvent(id)
          if (!ok) {
            toast("Impossible de supprimer l'événement", 'error')
            return
          }
          toast('Événement supprimé', 'info')
        }}
        onCheckin={async (purchaseId, eventId) => {
          const ok = await store.checkinPurchase(purchaseId, eventId)
          if (!ok) {
            toast('Impossible de valider ce billet', 'error')
            return
          }
          toast('Check-in mis à jour', 'success')
        }}
        toast={toast}
      />

      <Toast toasts={toasts} />
    </>
  )
}

export default App