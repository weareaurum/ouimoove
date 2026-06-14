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

function App() {
  const store = useStore()
  const { toasts, toast } = useToast()

  const [modal,           setModal]           = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [search,          setSearch]          = useState('')
  const [filterCity,      setFilterCity]      = useState('')
  const [filterCategory,  setFilterCategory]  = useState('')
  const [sortBy,          setSortBy]          = useState('date')

  const open  = (m) => setModal(m)
  const close = () => setModal(null)

  const requireAuth = (then) => {
    if (!store.user) { open('login'); return false }
    then()
    return true
  }

  const openEvent = (id) => { setSelectedEventId(id); open('event') }

  const handleAddToCart = (event, selections) => {
    const ok = store.addToCart(event, selections)
    if (!ok) { toast('Sélectionnez au moins 1 billet', 'error'); return }
    toast('Billets ajoutés au panier !', 'success')
    close()
  }

  const handlePurchase = async (method, phone) => {
    const result = await store.purchase(method, phone)
    if (!result) { toast('Paiement impossible. Réessayez.', 'error'); return }
    close()
    toast('🎉 Paiement confirmé ! Vos billets sont disponibles.', 'success')
  }

  const handleToggleFav = async (eventId) => {
    if (!requireAuth(() => {})) return
    const wasFav = store.favorites.includes(eventId)
    const ok = await store.toggleFavorite(eventId)
    if (!ok) { toast('Impossible de mettre à jour les favoris', 'error'); return }
    toast(wasFav ? 'Retiré des favoris' : 'Ajouté aux favoris ❤️', wasFav ? 'info' : 'success')
  }

  const selectedEvent = store.events.find((e) => e.id === selectedEventId)

  return (
    <>
      <Navbar
        user={store.user}
        cartCount={store.cartCount}
        isOrganizer={store.isOrganizer}
        onLogin={() => open('login')}
        onSignup={() => open('signup')}
        onCart={() => open('cart')}
        onTickets={() => requireAuth(() => open('tickets'))}
        onFavorites={() => requireAuth(() => open('favorites'))}
        onProfile={() => requireAuth(() => open('profile'))}
        onOrganizer={() => requireAuth(() => open('organizer'))}
        onLogout={async () => { await store.logout(); toast('À bientôt !', 'info') }}
      />

      <Hero
        search={search}           setSearch={setSearch}
        filterCity={filterCity}   setFilterCity={setFilterCity}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        sortBy={sortBy}           setSortBy={setSortBy}
      />

      <EventGrid
        events={store.events}
        favorites={store.favorites}
        loading={store.loading.events}
        error={store.errors.events}
        search={search}
        filterCity={filterCity}
        filterCategory={filterCategory}
        sortBy={sortBy}
        onOpenEvent={openEvent}
        onToggleFav={handleToggleFav}
      />

      {/* ── Auth ── */}
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
          if (r.needsEmailConfirmation) {
            toast('Vérifiez votre boîte email pour confirmer votre compte.', 'info')
            close()
            return null
          }
          toast('Compte créé ! Bienvenue ' + r.user.name, 'success')
          close()
          return null
        }}
        onGoogle={async () => {
          try { await store.googleLogin() }
          catch (e) { toast(e.message || 'Connexion Google impossible', 'error') }
        }}
      />

      {/* ── Event detail ── */}
      <EventDetailModal
        open={modal === 'event'}
        event={selectedEvent}
        onClose={close}
        onAddToCart={(selections) => requireAuth(() => handleAddToCart(selectedEvent, selections))}
      />

      {/* ── Cart ── */}
      <CartModal
        open={modal === 'cart'}
        cart={store.cart}
        cartTotal={store.cartTotal}
        onClose={close}
        onRemove={(id) => { store.removeFromCart(id); toast('Retiré du panier', 'info') }}
        onCheckout={() => open('checkout')}
      />

      {/* ── Checkout ── */}
      <CheckoutModal
        open={modal === 'checkout'}
        cart={store.cart}
        cartTotal={store.cartTotal}
        onClose={close}
        onConfirm={handlePurchase}
      />

      {/* ── My Tickets ── */}
      <MyTicketsModal
        open={modal === 'tickets'}
        purchases={store.myPurchases}
        onClose={close}
        toast={toast}
      />

      {/* ── Favorites ── */}
      <FavoritesModal
        open={modal === 'favorites'}
        events={store.events}
        favorites={store.favorites}
        onClose={close}
        onOpenEvent={openEvent}
        onToggleFav={handleToggleFav}
      />

      {/* ── Profile ── */}
      <ProfileModal
        open={modal === 'profile'}
        user={store.user}
        isOrganizer={store.isOrganizer}
        onClose={close}
        onSave={async (name, email, pwd) => {
          const updated = await store.updateProfile(name, email, pwd)
          if (!updated) { toast('Impossible de mettre à jour le profil', 'error'); return }
          toast('Profil mis à jour', 'success')
          close()
        }}
        onLogout={async () => { await store.logout(); toast('À bientôt !', 'info'); close() }}
        onApply={store.applyForOrganizer}
      />

      {/* ── Organizer Dashboard ── */}
      <OrganizerModal
        open={modal === 'organizer'}
        user={store.user}
        isAdmin={store.isAdmin}
        myEvents={store.myEvents}
        purchases={store.purchases}
        organizerOrders={store.organizerOrders}
        organizerStats={store.organizerStats}
        applications={store.applications}
        loading={store.loading}
        errors={store.errors}
        onClose={close}
        onCreate={async (ev) => {
          const created = await store.createEvent(ev)
          if (!created) { toast("Impossible de publier l'événement", 'error'); return null }
          toast('Événement publié ! 🎉', 'success')
          return created
        }}
        onDelete={async (id) => {
          const ok = await store.deleteEvent(id)
          if (!ok) { toast("Impossible de supprimer l'événement", 'error'); return }
          toast('Événement supprimé', 'info')
        }}
        onCheckin={async (purchaseId, eventId) => {
          const ok = await store.checkinPurchase(purchaseId, eventId)
          if (!ok) { toast('Impossible de valider ce billet', 'error'); return }
          toast('Check-in mis à jour ✓', 'success')
        }}
        onRefresh={store.refreshOrganizerData}
        onPromote={async (userId, appId) => {
          const ok = await store.promoteToOrganizer(userId, appId)
          if (!ok) { toast('Impossible de promouvoir cet utilisateur', 'error'); return }
          toast('Utilisateur promu organisateur ✓', 'success')
        }}
        onReject={async (appId) => {
          const ok = await store.rejectApplication(appId)
          if (!ok) { toast('Impossible de refuser la demande', 'error'); return }
          toast('Demande refusée', 'info')
        }}
        onLoadApplications={store.loadApplications}
        toast={toast}
      />

      <Toast toasts={toasts} />
    </>
  )
}

export default App
