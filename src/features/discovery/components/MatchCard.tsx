import React from 'react'
import type { MatchSuggestion } from '../types'
import '../../shared.css'

interface MatchCardProps {
  suggestion: MatchSuggestion
  onAccept?: (id: string) => void
  onDecline?: (id: string) => void
}

const MatchCardComponent: React.FC<MatchCardProps> = ({ suggestion, onAccept, onDecline }) => (
  <article className="card">
    <div className="card__header">
      <div className="card__avatar card__avatar--placeholder">
        {suggestion.profile.fullName.charAt(0)}
      </div>
      <div>
        <h3>{suggestion.profile.fullName}</h3>
        {suggestion.profile.headline && (
          <p className="card__subtitle">{suggestion.profile.headline}</p>
        )}
        {(suggestion.profile.position || suggestion.profile.company) && (
          <p className="card__subtitle">
            {[suggestion.profile.position, suggestion.profile.company]
              .filter(Boolean)
              .join(' • ')}
          </p>
        )}
      </div>
      <span className="tag">{Math.round(suggestion.compatibilityScore * 100)}% match</span>
    </div>
    <div className="card__body">
      {suggestion.profile.bio && <p>{suggestion.profile.bio}</p>}
      {suggestion.profile.skills && suggestion.profile.skills.length > 0 && (
        <>
          <strong>Compétences</strong>
          <ul className="pill-list">
            {suggestion.profile.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </>
      )}
      <strong>Intérêts communs</strong>
      <ul className="pill-list">
        {suggestion.sharedInterests.map((interest) => (
          <li key={interest}>{interest}</li>
        ))}
      </ul>
      {suggestion.profile.links && suggestion.profile.links.length > 0 && (
        <div>
          <strong>Liens</strong>
          <ul className="card__links">
            {suggestion.profile.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
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

const MatchCard = React.memo(
  MatchCardComponent,
  (prev, next) =>
    prev.suggestion === next.suggestion &&
    prev.onAccept === next.onAccept &&
    prev.onDecline === next.onDecline,
)

export default MatchCard
