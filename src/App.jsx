import { useState } from 'react'
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
import { useEffect } from "react";
import { supabase } from "./lib/supabase";

function App() {
  useEffect(() => {
    const testSupabase = async () => {
      console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);

      const { data, error } = await supabase.from("your_table_name").select("*");

      console.log("DATA:", data);
      console.log("ERROR:", error);
    };

    testSupabase();
  }, []);

  return <div>Ouimoove</div>;
}

export default App;
export default function App() {
  const store = useStore()
  const { toasts, toast } = useToast()

  const [modal, setModal] = useState(null) // 'login'|'signup'|'event'|'cart'|'checkout'|'tickets'|'favorites'|'profile'|'organizer'
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('date')

  const open = (m) => setModal(m)
  const close = () => setModal(null)

  const openEvent = (id) => { setSelectedEventId(id); open('event') }
  const requireAuth = (then) => { if (!store.user) { open('login'); return false } then(); return true }

  const handleAddToCart = (event, selections) => {
    const ok = store.addToCart(event, selections)
    if (!ok) { toast('Sélectionnez au moins 1 billet', 'error'); return }
    toast('Billets ajoutés au panier !', 'success')
    close()
  }

  const handlePurchase = (method) => {
    store.purchase(method)
    close()
    toast('🎉 Paiement confirmé ! Vos billets sont disponibles.', 'success')
  }

  const handleToggleFav = (eventId) => {
    if (!requireAuth(() => {})) return
    const wasFav = store.favorites.includes(eventId)
    store.toggleFavorite(eventId)
    toast(wasFav ? 'Retiré des favoris' : 'Ajouté aux favoris ❤️', wasFav ? 'info' : 'success')
  }

  const selectedEvent = store.events.find(e => e.id === selectedEventId)

  return (
    <>
      <Navbar
        user={store.user}
        cartCount={store.cartCount}
        onLogin={() => open('login')}
        onSignup={() => open('signup')}
        onCart={() => open('cart')}
        onTickets={() => requireAuth(() => open('tickets'))}
        onFavorites={() => requireAuth(() => open('favorites'))}
        onProfile={() => requireAuth(() => open('profile'))}
        onOrganizer={() => requireAuth(() => open('organizer'))}
        onLogout={() => { store.logout(); toast('À bientôt !', 'info') }}
      />

      <Hero
        search={search} setSearch={setSearch}
        filterCity={filterCity} setFilterCity={setFilterCity}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        sortBy={sortBy} setSortBy={setSortBy}
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

      {/* ── MODALS ── */}
      <AuthModal
        mode={modal === 'login' ? 'login' : modal === 'signup' ? 'signup' : null}
        onClose={close}
        onSwitch={(m) => open(m)}
        onLogin={(email, pwd) => {
          const r = store.login(email, pwd)
          if (!r.ok) return r.error
          toast('Bienvenue, ' + r.user.name + ' !', 'success')
          close()
        }}
        onSignup={(name, email, pwd) => {
          const r = store.signup(name, email, pwd)
          if (!r.ok) return r.error
          toast('Compte créé ! Bienvenue ' + r.user.name, 'success')
          close()
        }}
        onGoogle={() => {
          const u = store.googleLogin()
          toast('Connecté via Google — ' + u.name, 'success')
          close()
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
        onRemove={(id) => { store.removeFromCart(id); toast('Retiré du panier', 'info') }}
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
        onSave={(name, email, pwd) => {
          store.updateProfile(name, email, pwd)
          toast('Profil mis à jour', 'success')
          close()
        }}
        onLogout={() => { store.logout(); toast('À bientôt !', 'info'); close() }}
      />

      <OrganizerModal
        open={modal === 'organizer'}
        user={store.user}
        myEvents={store.myEvents}
        purchases={store.purchases}
        onClose={close}
        onCreate={(ev) => { store.createEvent(ev); toast('Événement publié ! 🎉', 'success') }}
        onDelete={(id) => { store.deleteEvent(id); toast('Événement supprimé', 'info') }}
        onCheckin={(id) => store.checkinPurchase(id)}
        toast={toast}
      />

      <Toast toasts={toasts} />
    </>
  )
}
