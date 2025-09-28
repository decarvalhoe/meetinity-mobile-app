import React, { useEffect } from 'react'
import MatchCard from '../components/MatchCard'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

const DiscoveryScreen: React.FC = () => {
  const { state, refreshMatches, acceptMatch, declineMatch } = useAppStore()

  useEffect(() => {
    if (state.matches.status === 'idle') {
      refreshMatches()
    }
  }, [state.matches.status, refreshMatches])

  if (state.matches.status === 'loading' && state.matches.data.length === 0) {
    return <div className="loading">Recherche de profils pertinents…</div>
  }

  if (state.matches.status === 'error') {
    return (
      <div className="error-state" role="alert">
        Impossible de récupérer les matchs. <button onClick={refreshMatches}>Réessayer</button>
      </div>
    )
  }

  return (
    <section aria-labelledby="discovery-title">
      <header className="section-header">
        <h1 id="discovery-title">Découverte</h1>
        <button type="button" className="secondary" onClick={refreshMatches}>
          Rafraîchir
        </button>
      </header>
      {state.matches.data.length === 0 ? (
        <p className="loading">Aucun profil ne correspond à vos critères pour le moment.</p>
      ) : (
        state.matches.data.map((suggestion) => (
          <MatchCard
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={acceptMatch}
            onDecline={declineMatch}
          />
        ))
      )}
    </section>
  )
}

export default DiscoveryScreen
