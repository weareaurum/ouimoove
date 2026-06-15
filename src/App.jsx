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
import { ResaleMarketModal } from './components/modals/ResaleMarketModal.jsx'

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

  // ── Service worker registration ────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  // ── PayDunya return handling ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('paydunya_return') === '1') {
      window.history.replaceState({}, '', window.location.pathname)
      ;(async () => {
        toast('Vérification du paiement…', 'info')
        const result = await store.verifyPaydunyaReturn()
        if (result?.ok) {
          toast('🎉 Paiement confirmé ! Vos billets sont disponibles.', 'success')
          open('tickets')
        } else {
          toast('Paiement annulé ou échoué.', 'error')
        }
      })()
    } else if (params.get('paydunya_cancel') === '1') {
      window.history.replaceState({}, '', window.location.pathname)
      toast('Paiement annulé.', 'info')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handlePurchase = async (method, phone, discountAmount = 0) => {
    const result = await store.purchase(method, phone, discountAmount)
    if (!result) { toast('Paiement impossible. Réessayez.', 'error'); return }
    if (result.redirect) {
      window.location.href = result.redirect
      return
    }
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

  const handleCreateEvent = () => {
    if (!store.user) { open('login'); return }
    if (store.isOrganizer) { open('organizer'); return }
    open('profile')
    toast('Soumettez une demande pour devenir organisateur et publier vos événements.', 'info')
  }

  const handleLogoClick = () => {
    setSearch('')
    setFilterCity('')
    setFilterCategory('')
    setSortBy('date')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Resale market ──────────────────────────────────────────
  // My listings (to show "en vente" badge on tickets)
  const myListings = store.resaleListings.filter(l => l.seller_id === store.user?.id)

  const handleBuyResale = async (listing, method, phone) => {
    const result = await store.buyResaleListing(listing, method, phone)
    if (!result) { toast('Achat impossible. Réessayez.', 'error'); return result }
    if (result.error) { toast(result.error, 'error'); return result }
    if (result.redirect) { window.location.href = result.redirect; return result }
    toast('🎉 Billet acheté ! Disponible dans Mes Billets.', 'success')
    return result
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
        onLogoClick={handleLogoClick}
        onMarket={() => open('market')}
        onCreateEvent={handleCreateEvent}
      />

      <Hero
        search={search}           setSearch={setSearch}
        filterCity={filterCity}   setFilterCity={setFilterCity}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        sortBy={sortBy}           setSortBy={setSortBy}
        onCreateEvent={handleCreateEvent}
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
        myListings={myListings}
        onClose={close}
        toast={toast}
        onListForResale={async (params) => {
          if (!store.user) return null
          return await store.listTicketForResale(params)
        }}
        onCancelListing={async (listingId) => {
          const ok = await store.cancelResaleListing(listingId)
          if (ok) toast('Annonce retirée.', 'info')
          else toast('Impossible de retirer l\'annonce.', 'error')
        }}
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
        onSubscribePush={async () => {
          const ok = await store.subscribePush()
          if (ok) toast('Notifications activées 🔔', 'success')
          else toast('Notifications non disponibles', 'error')
          return ok
        }}
        onUnsubscribePush={async () => {
          await store.unsubscribePush()
          toast('Notifications désactivées', 'info')
        }}
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
        onUpdate={async (eventId, data) => {
          const ok = await store.updateEvent(eventId, data)
          if (!ok) toast("Impossible de mettre à jour l'événement", 'error')
          return ok
        }}
        onDelete={async (id) => {
          const ok = await store.deleteEvent(id)
          if (!ok) { toast("Impossible de supprimer l'événement", 'error'); return }
          toast('Événement supprimé', 'info')
        }}
        onRefund={async (orderId) => {
          const ok = await store.refundOrder(orderId)
          if (!ok) { toast('Impossible de rembourser la commande', 'error'); return }
          toast('Commande remboursée ↩', 'info')
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
        onUploadImage={store.uploadEventImage}
        toast={toast}
      />

      {/* ── Resale Market ── */}
      <ResaleMarketModal
        open={modal === 'market'}
        listings={store.resaleListings}
        currentUserId={store.user?.id}
        loading={store.loading.resale}
        onClose={close}
        onBuy={async (listing, method, phone) => {
          if (!store.user) { open('login'); return null }
          return await handleBuyResale(listing, method, phone)
        }}
      />

      <Toast toasts={toasts} />
    </>
  )
}

export default App
