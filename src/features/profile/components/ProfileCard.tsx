import React from 'react'
import type { ProfilePreferences, UserProfile } from '../types'
import '../../shared.css'

interface ProfileCardProps {
  profile: UserProfile
  preferences?: ProfilePreferences | null
  onEdit?: () => void
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, preferences, onEdit }) => {
  const resolvedPreferences = preferences ?? profile.preferences ?? null
  const radiusLabel =
    resolvedPreferences?.discoveryRadiusKm != null
      ? `Rayon : ${resolvedPreferences.discoveryRadiusKm} km`
      : null

  return (
    <article className="card">
      <div className="card__header">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.fullName} className="card__avatar" />
        ) : (
          <div className="card__avatar card__avatar--placeholder">{profile.fullName.charAt(0)}</div>
        )}
        <div>
          <h2>{profile.fullName}</h2>
          {profile.headline && <p className="card__subtitle">{profile.headline}</p>}
          {(profile.position || profile.company) && (
            <p className="card__subtitle">
              {[profile.position, profile.company].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
        {onEdit && (
          <button type="button" className="card__action" onClick={onEdit}>
            Modifier
          </button>
        )}
      </div>
      {profile.bio && <p className="card__body">{profile.bio}</p>}
      <footer className="card__footer">
        <div>
          <strong>Intérêts</strong>
          <ul className="pill-list">
            {profile.interests.map((interest) => (
              <li key={interest}>{interest}</li>
            ))}
          </ul>
        </div>
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <strong>Compétences</strong>
            <ul className="pill-list">
              {profile.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        )}
        {profile.location && (
          <div>
            <strong>Localisation</strong>
            <p>{profile.location}</p>
          </div>
        )}
        {profile.availability && (
          <div>
            <strong>Disponibilités</strong>
            <p>{profile.availability}</p>
          </div>
        )}
        {profile.links && profile.links.length > 0 && (
          <div>
            <strong>Liens</strong>
            <ul className="card__links">
              {profile.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {resolvedPreferences && (
          <div>
            <strong>Préférences</strong>
            <ul className="pill-list">
              {radiusLabel && <li key="radius">{radiusLabel}</li>}
              {resolvedPreferences.industries.map((industry) => (
                <li key={`industry-${industry}`}>{industry}</li>
              ))}
              {resolvedPreferences.interests
                .filter((interest) => !profile.interests.includes(interest))
                .map((interest) => (
                  <li key={`pref-interest-${interest}`}>{interest}</li>
                ))}
              {resolvedPreferences.eventTypes?.map((eventType) => (
                <li key={`pref-event-${eventType}`}>{eventType}</li>
              ))}
            </ul>
          </div>
        )}
      </footer>
    </article>
  )
}

export default ProfileCard
