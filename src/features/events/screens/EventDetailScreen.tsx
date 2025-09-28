import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../../store/AppStore'
import type { EventDetails, EventSummary } from '../types'
import '../../shared.css'

const createFallbackDetail = (summary: EventSummary): EventDetails => ({
  ...summary,
  organizer: {
    id: summary.category?.id ?? 'organizer',
    name: summary.category?.name ? `Organisé par ${summary.category.name}` : 'Organisateur à confirmer',
  },
  participants: [],
  isRegistered: Boolean(summary.isRegistered),
})

const EventDetailScreen: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { state, loadEventDetails, toggleEventRegistration } = useAppStore()
  const [event, setEvent] = useState<EventDetails | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined)

  const summary = useMemo(() => state.events.data.items.find((item) => item.id === eventId), [
    state.events.data.items,
    eventId,
  ])

  const cachedDetail = eventId ? state.eventDetails[eventId] : undefined

  useEffect(() => {
    if (cachedDetail) {
      setEvent(cachedDetail)
      setIsLoading(false)
    }
  }, [cachedDetail])

  useEffect(() => {
    if (!eventId) {
      setError("Événement introuvable")
      setIsLoading(false)
      return
    }
    let active = true
    const fetchDetails = async () => {
      setIsLoading(true)
      setError(undefined)
      try {
        const details = await loadEventDetails(eventId)
        if (!active) return
        if (details) {
          setEvent(details)
          setStatusMessage(undefined)
        } else if (summary) {
          setEvent(createFallbackDetail(summary))
          setStatusMessage('Affichage des informations en cache')
        } else {
          setError("Impossible de charger cet événement")
        }
      } catch (err) {
        if (!active) return
        if (summary) {
          setEvent(createFallbackDetail(summary))
          setStatusMessage('Affichage hors ligne des informations disponibles')
          setError(undefined)
        } else {
          setError((err as Error).message)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }
    void fetchDetails()
    return () => {
      active = false
    }
  }, [eventId, loadEventDetails, summary])

  const pendingAction = useMemo(
    () => state.pendingEventRegistrations.find((item) => item.eventId === eventId),
    [state.pendingEventRegistrations, eventId],
  )

  const isProcessing = Boolean(pendingAction && !pendingAction.error)

  const handleToggle = async () => {
    if (!event || !eventId) return
    try {
      await toggleEventRegistration(eventId, !event.isRegistered)
      setStatusMessage(undefined)
    } catch (err) {
      setStatusMessage((err as Error).message)
    }
  }

  return (
    <section className="event-detail" aria-live="polite">
      <button type="button" className="secondary" onClick={() => navigate(-1)}>
        Retour
      </button>
      {isLoading && <p className="loading">Chargement des détails…</p>}
      {error && !isLoading && (
        <div className="error-state" role="alert">
          {error}
          <div>
            <button type="button" onClick={() => (eventId ? void loadEventDetails(eventId, { force: true }) : undefined)}>
              Réessayer
            </button>
          </div>
        </div>
      )}
      {!isLoading && !error && event && (
        <article className="card event-detail__card">
          <header className="card__header">
            <div>
              <h2>{event.title}</h2>
              <p className="card__subtitle">
                {new Date(event.startAt).toLocaleString()} • {event.location}
              </p>
            </div>
            {event.category && (
              <span className="tag" style={{ backgroundColor: event.category.color }}>
                {event.category.name}
              </span>
            )}
          </header>
          <div className="card__body">
            <p>{event.description}</p>
            {event.agenda && (
              <section>
                <h3>Programme</h3>
                <p>{event.agenda}</p>
              </section>
            )}
            {event.speakers && event.speakers.length > 0 && (
              <section>
                <h3>Intervenants</h3>
                <ul>
                  {event.speakers.map((speaker) => (
                    <li key={speaker}>{speaker}</li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3>Organisateur</h3>
              <p>
                <strong>{event.organizer.name}</strong>
              </p>
              {event.organizer.bio && <p>{event.organizer.bio}</p>}
              {event.contactEmail && (
                <p>
                  <strong>Contact :</strong> {event.contactEmail}
                </p>
              )}
            </section>
            <section>
              <h3>Participants ({event.attendingCount}/{event.capacity})</h3>
              {event.participants.length === 0 ? (
                <p>Aucun participant inscrit pour le moment.</p>
              ) : (
                <ul>
                  {event.participants.map((participant) => (
                    <li key={participant.id}>{participant.name}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <footer className="card__footer card__footer--actions">
            <button
              type="button"
              className="primary"
              disabled={isProcessing || (!event.isRegistered && event.attendingCount >= event.capacity)}
              onClick={handleToggle}
            >
              {isProcessing
                ? 'Synchronisation…'
                : event.isRegistered
                ? 'Se désinscrire'
                : event.attendingCount >= event.capacity
                ? 'Complet'
                : "S'inscrire"}
            </button>
            {pendingAction?.error && (
              <p className="error-state" role="status">
                Action en attente ({pendingAction.error})
              </p>
            )}
          </footer>
          {statusMessage && <p className="loading">{statusMessage}</p>}
        </article>
      )}
    </section>
  )
}

export default EventDetailScreen
