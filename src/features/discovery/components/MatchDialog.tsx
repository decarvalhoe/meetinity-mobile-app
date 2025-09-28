import React from 'react'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

const MatchDialog: React.FC = () => {
  const { state, acknowledgeMatchNotification } = useAppStore()
  const match = state.matchNotifications[0]

  if (!match) {
    return null
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-live="assertive">
      <div className="modal">
        <h2>Nouveau match ✨</h2>
        <p>
          Vous avez été mis en relation avec <strong>{match.profile.fullName}</strong>.
        </p>
        <p className="hint">Démarrez une conversation pour faire connaissance !</p>
        <div className="modal__actions">
          <button type="button" className="primary" onClick={() => acknowledgeMatchNotification(match.id)}>
            Super !
          </button>
        </div>
      </div>
    </div>
  )
}

export default MatchDialog
