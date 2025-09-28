import React, { useEffect } from 'react'
import EventCard from '../components/EventCard'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

const EventsScreen: React.FC = () => {
  const { state, refreshEvents, toggleEventRegistration } = useAppStore()

  useEffect(() => {
    if (state.events.status === 'idle') {
      refreshEvents()
    }
  }, [state.events.status, refreshEvents])

  if (state.events.status === 'loading' && state.events.data.length === 0) {
    return <div className="loading">Chargement des événements…</div>
  }

  if (state.events.status === 'error') {
    return (
      <div className="error-state" role="alert">
        Impossible de récupérer les événements. <button onClick={refreshEvents}>Réessayer</button>
      </div>
    )
  }

  return (
    <section aria-labelledby="events-title">
      <header className="section-header">
        <h1 id="events-title">Événements</h1>
        <button type="button" className="secondary" onClick={refreshEvents}>
          Actualiser
        </button>
      </header>
      {state.events.data.length === 0 ? (
        <p className="loading">Aucun événement n'est planifié pour le moment.</p>
      ) : (
        state.events.data.map((event) => (
          <EventCard key={event.id} event={event} onToggleRegistration={toggleEventRegistration} />
        ))
      )}
    </section>
  )
}

export default EventsScreen
