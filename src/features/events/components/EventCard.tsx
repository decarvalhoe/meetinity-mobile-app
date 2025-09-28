import React from 'react'
import type { EventSummary } from '../types'
import '../../shared.css'

interface EventCardProps {
  event: EventSummary
  onToggleRegistration?: (eventId: string, attending: boolean) => void
  onViewDetails?: (eventId: string) => void
  isProcessing?: boolean
}

const EventCard: React.FC<EventCardProps> = ({ event, onToggleRegistration, onViewDetails, isProcessing }) => {
  const isFull = event.attendingCount >= event.capacity
  const isRegistered = Boolean(event.isRegistered)
  const isDisabled = isProcessing || (!isRegistered && isFull)
  const actionLabel = isRegistered ? 'Se désinscrire' : isFull ? 'Complet' : "S'inscrire"
  const handleToggle = () => {
    if (!onToggleRegistration) return
    if (!isRegistered && isFull) return
    onToggleRegistration(event.id, !isRegistered)
  }
  return (
    <article className="card">
      <div className="card__header">
        <div>
          <h3>{event.title}</h3>
          <p className="card__subtitle">{new Date(event.startAt).toLocaleString()}</p>
        </div>
        {event.category && <span className="tag" style={{ backgroundColor: event.category.color }}>{event.category.name}</span>}
      </div>
      <div className="card__body">
        <p>{event.description}</p>
        <p>
          <strong>Lieu :</strong> {event.location}
        </p>
        <p>
          <strong>Participants :</strong> {event.attendingCount}/{event.capacity}
        </p>
      </div>
      <div className="card__footer card__footer--actions">
        <button type="button" className="primary" disabled={isDisabled} onClick={handleToggle}>
          {isProcessing ? 'Synchronisation…' : actionLabel}
        </button>
        {onViewDetails && (
          <button type="button" className="secondary" onClick={() => onViewDetails(event.id)}>
            Voir les détails
          </button>
        )}
      </div>
    </article>
  )
}

export default EventCard
