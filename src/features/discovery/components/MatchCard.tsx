import React from 'react'
import type { MatchSuggestion } from '../types'
import '../../shared.css'

interface MatchCardProps {
  suggestion: MatchSuggestion
  onAccept?: (id: string) => void
  onDecline?: (id: string) => void
}

const MatchCard: React.FC<MatchCardProps> = ({ suggestion, onAccept, onDecline }) => (
  <article className="card">
    <div className="card__header">
      <div className="card__avatar card__avatar--placeholder">
        {suggestion.profile.fullName.charAt(0)}
      </div>
      <div>
        <h3>{suggestion.profile.fullName}</h3>
        <p className="card__subtitle">{suggestion.profile.headline}</p>
      </div>
      <span className="tag">{Math.round(suggestion.compatibilityScore * 100)}% match</span>
    </div>
    <div className="card__body">
      <p>{suggestion.profile.bio}</p>
      <strong>Intérêts communs</strong>
      <ul className="pill-list">
        {suggestion.sharedInterests.map((interest) => (
          <li key={interest}>{interest}</li>
        ))}
      </ul>
    </div>
    <div className="card__footer card__footer--actions">
      <button type="button" className="secondary" onClick={() => onDecline?.(suggestion.id)}>
        Passer
      </button>
      <button type="button" className="primary" onClick={() => onAccept?.(suggestion.id)}>
        Entrer en contact
      </button>
    </div>
  </article>
)

export default MatchCard
