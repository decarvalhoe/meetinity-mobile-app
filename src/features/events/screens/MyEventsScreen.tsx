import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'
import { OfflinePlaceholder, ScreenState, useOnlineStatus } from '../../shared'

const MyEventsScreen: React.FC = () => {
  const navigate = useNavigate()
  const { state, toggleEventRegistration } = useAppStore()
  const isOnline = useOnlineStatus()

  const registeredEvents = useMemo(
    () => state.events.data.items.filter((event) => event.isRegistered),
    [state.events.data.items],
  )

  const pendingByEvent = useMemo(() => {
    const map = new Map<string, { pending: boolean; error?: string }>()
    state.pendingEventRegistrations.forEach((action) => {
      map.set(action.eventId, { pending: !action.error, error: action.error })
    })
    return map
  }, [state.pendingEventRegistrations])

  return (
    <section aria-labelledby="my-events-title" className="events-screen">
      <header className="section-header">
        <h1 id="my-events-title">Mes événements</h1>
        <button type="button" className="secondary" onClick={() => navigate('..')}>
          Découvrir
        </button>
      </header>

      {!isOnline && (
        <OfflinePlaceholder
          description="Les événements enregistrés restent disponibles hors connexion."
          retryLabel="Recharger"
          onRetry={() => navigate('..')}
        />
      )}

      {registeredEvents.length === 0 ? (
        <ScreenState
          tone="info"
          title="Aucun événement inscrit"
          description="Explorez le catalogue pour vous inscrire aux événements qui vous intéressent."
          actions={
            <button type="button" className="primary" onClick={() => navigate('..')}>
              Parcourir les événements
            </button>
          }
        />
      ) : (
        <div className="events-grid">
          {registeredEvents.map((event) => {
            const pendingInfo = pendingByEvent.get(event.id)
            return (
              <div key={event.id} className="events-grid__item">
                <EventCard
                  event={event}
                  onToggleRegistration={toggleEventRegistration}
                  onViewDetails={(eventId) => navigate(`../${eventId}`)}
                  isProcessing={Boolean(pendingInfo?.pending)}
                />
                {pendingInfo?.error && (
                  <p className="state state--inline state--error" role="status">
                    Action en attente ({pendingInfo.error})
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default MyEventsScreen
