import { useState, useEffect } from 'react'
import { useStore } from './hooks/useStore.js'
import { useToast } from './hooks/useToast.js'
import { Navbar } from './components/Navbar.jsx'
import { Hero } from './components/Hero.jsx'
import { EventGrid } from './components/EventGrid.jsx'
import { Footer } from './components/Footer.jsx'
import { Toast } from './components/Toast.jsx'
import { OnboardingModal, FaqModal, ContactModal, TermsModal } from './components/modals/InfoModals.jsx'
import { AuthModal } from './components/modals/AuthModal.jsx'
import { EventDetailModal } from './components/modals/EventDetailModal.jsx'
import { CartModal } from './components/modals/CartModal.jsx'
import { CheckoutModal } from './components/modals/CheckoutModal.jsx'
import { MyTicketsModal } from './components/modals/MyTicketsModal.jsx'
import { FavoritesModal } from './components/modals/FavoritesModal.jsx'
import { ProfileModal } from './components/modals/ProfileModal.jsx'
import { OrganizerModal } from './components/modals/OrganizerModal.jsx'
import { ResaleMarketModal } from './components/modals/ResaleMarketModal.jsx'
import { FeedModal } from './components/modals/FeedModal.jsx'

function App() {
  const store = useStore()
  const { toasts, toast } = useToast()

  const [modal,           setModal]           = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [search,          setSearch]          = useState('')
  const [filterCity,      setFilterCity]      = useState('')
  const [filterCategory,  setFilterCategory]  = useState('')
  const [sortBy,          setSortBy]          = useState('date')
  const [cities,          setCities]          = useState([])

  const open  = (m) => setModal(m)
  const close = () => setModal(null)

  // ── Service worker + cities ────────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
    store.loadCities().then(list => { if (list?.length) setCities(list) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    } else if (params.get('invite')) {
      const token = params.get('invite')
      window.history.replaceState({}, '', window.location.pathname)
      ;(async () => {
        if (!store.user) {
          sessionStorage.setItem('pending_invite', token)
          toast('Connectez-vous pour accepter cette invitation.', 'info')
          open('login')
          return
        }
        const result = await store.acceptInvitation(token)
        if (result?.ok) {
          toast('🎉 Invitation acceptée ! Vous pouvez maintenant voir et réserver cet événement.', 'success')
        } else if (result?.error === 'email_mismatch') {
          toast(`Cette invitation est destinée à ${result.invited_email}. Connectez-vous avec ce compte.`, 'error')
        } else {
          toast(result?.error || 'Lien d\'invitation invalide.', 'error')
        }
      })()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Accept pending invite after login
  useEffect(() => {
    if (!store.user) return
    const token = sessionStorage.getItem('pending_invite')
    if (!token) return
    sessionStorage.removeItem('pending_invite')
    ;(async () => {
      const result = await store.acceptInvitation(token)
      if (result?.ok) {
        toast('🎉 Invitation acceptée ! Vous pouvez maintenant voir et réserver cet événement.', 'success')
        await store.loadEvents()
      } else if (result?.error === 'email_mismatch') {
        toast(`Cette invitation est destinée à ${result.invited_email}.`, 'error')
      } else {
        toast(result?.error || 'Lien d\'invitation invalide.', 'error')
      }
    })()
  }, [store.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── First-visit onboarding ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hasFlow = params.get('paydunya_return') || params.get('paydunya_cancel') || params.get('invite')
    if (hasFlow) return
    if (!localStorage.getItem('om_onboarded')) {
      const t = setTimeout(() => setModal(m => m ?? 'onboarding'), 600)
      return () => clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const closeOnboarding = () => {
    localStorage.setItem('om_onboarded', '1')
    close()
  }

  const requireAuth = (then) => {
    if (!store.user) { open('login'); return false }
    then()
    return true
  }

  const openFeed = () => requireAuth(() => { store.loadFeedPosts(); open('feed') })

  const openEvent = (id) => { setSelectedEventId(id); open('event') }

  const handleAddToCart = (event, selections) => {
    const result = store.addToCart(event, selections)
    if (!result) { toast('Sélectionnez au moins 1 billet', 'error'); return }
    if (result.error) { toast(result.error, 'error'); return }
    toast('Billets ajoutés au panier !', 'success')
    close()
  }

  const handlePurchase = async (method, phone, discountAmount = 0) => {
    const result = await store.purchase(method, phone, discountAmount)
    if (!result) { toast('Paiement impossible. Réessayez.', 'error'); return }
    if (result.error) { toast(result.error, 'error'); return }
    if (result.pdError) { toast(`Erreur PayDunya : ${result.pdError}`, 'error'); return }
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

  const handleCreateEvent = async () => {
    if (!store.user) { open('login'); return }
    if (!store.isOrganizer) {
      const ok = await store.becomeOrganizer()
      if (!ok) { toast('Impossible d\'activer le mode organisateur. Réessayez.', 'error'); return }
    }
    open('organizer')
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
        onFeed={openFeed}
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
        userNumber={store.userNumber}
        isVerified={store.isVerified}
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
        onSubmitVerification={async (file) => {
          const result = await store.submitVerification(file)
          if (result?.ok) toast('Document envoyé ! Vérification en cours.', 'success')
          else toast(result?.error || 'Erreur lors de l\'envoi.', 'error')
          return result
        }}
        onLoadVerificationStatus={store.loadVerificationStatus}
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
        onCheckinByRef={store.checkinByRef}
        onCheckinPartial={store.checkinPartial}
        onLookupByRef={store.lookupByRef}
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
        onInvite={store.inviteToEvent}
        onLoadInvitations={store.loadInvitations}
        cities={cities}
        onRequestCity={async (name) => {
          const result = await store.requestCity(name)
          if (!result?.ok) toast(result?.error || 'Erreur lors de la demande', 'error')
          return result
        }}
        onLoadCityRequests={store.loadCityRequests}
        onApproveCityRequest={async (id, name) => {
          const ok = await store.approveCityRequest(id, name)
          if (ok) { toast(`Ville "${name}" ajoutée ✓`, 'success'); store.loadCities().then(l => { if (l?.length) setCities(l) }) }
          else toast('Impossible d\'approuver', 'error')
          return ok
        }}
        onDenyCityRequest={async (id) => {
          const ok = await store.denyCityRequest(id)
          if (ok) toast('Demande refusée.', 'info')
          else toast('Impossible de refuser', 'error')
          return ok
        }}
        onLoadVerifRequests={store.loadVerificationRequests}
        onApproveVerif={async (userId) => {
          const ok = await store.approveVerification(userId)
          if (ok) toast('Compte vérifié ✓', 'success')
          else toast('Impossible d\'approuver', 'error')
          return ok
        }}
        onDenyVerif={async (userId, reason) => {
          const ok = await store.denyVerification(userId, reason)
          if (ok) toast('Demande refusée.', 'info')
          else toast('Impossible de refuser', 'error')
          return ok
        }}
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

      {/* ── Feed ── */}
      <FeedModal
        open={modal === 'feed'}
        posts={store.feedPosts}
        events={store.events}
        loading={store.loading.feed}
        currentUserId={store.user?.id}
        onClose={close}
        onCreate={store.createFeedPost}
        onDelete={async (postId) => {
          const ok = await store.deleteFeedPost(postId)
          if (ok) toast('Moment supprimé', 'info')
          else toast('Impossible de supprimer ce moment', 'error')
        }}
        toast={toast}
      />

      <Footer
        onHowItWorks={() => open('onboarding')}
        onFaq={() => open('faq')}
        onContact={() => open('contact')}
        onTerms={() => open('terms')}
        onMarket={() => open('market')}
        onCreateEvent={handleCreateEvent}
      />

      {/* ── Onboarding / How it works ── */}
      <OnboardingModal open={modal === 'onboarding'} onClose={closeOnboarding} />

      {/* ── FAQ ── */}
      <FaqModal
        open={modal === 'faq'}
        onClose={close}
        onContact={() => open('contact')}
      />

      {/* ── Contact ── */}
      <ContactModal
        open={modal === 'contact'}
        onClose={close}
        user={store.user}
        toast={toast}
        onSubmit={store.submitContact}
      />

      {/* ── Terms ── */}
      <TermsModal open={modal === 'terms'} onClose={close} />

      <Toast toasts={toasts} />
    </>
  )
}

export default App
