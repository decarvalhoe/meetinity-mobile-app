import React, { useMemo, useEffect } from 'react'
import SwipeCarousel from '../components/SwipeCarousel'
import MatchDialog from '../components/MatchDialog'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'

const DiscoveryScreen: React.FC = () => {
  const { state, refreshMatches } = useAppStore()

  const lastUpdated = useMemo(() => {
    if (!state.matchFeedMeta?.fetchedAt) return null
    try {
      return new Date(state.matchFeedMeta.fetchedAt).toLocaleString('fr-FR')
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Unable to format match feed timestamp', error)
      }
      return state.matchFeedMeta.fetchedAt
    }
  }, [state.matchFeedMeta?.fetchedAt])

  useEffect(() => {
    if (state.matches.status === 'idle') {
      refreshMatches()
    }
  }, [state.matches.status, refreshMatches])

  return (
    <section aria-labelledby="discovery-title">
      <MatchDialog />
      <header className="section-header">
        <h1 id="discovery-title">Découverte</h1>
        <button type="button" className="secondary" onClick={refreshMatches}>
          Rafraîchir
        </button>
      </header>
      {lastUpdated && <p className="hint">Dernière mise à jour : {lastUpdated}</p>}
      <SwipeCarousel />
    </section>
  )
}

export default DiscoveryScreen
