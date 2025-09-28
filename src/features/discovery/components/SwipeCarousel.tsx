import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MatchCard from './MatchCard'
import { useAppStore } from '../../../store/AppStore'
import type { MatchFeedItem } from '../types'
import '../../shared.css'

const swipeVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 240 : -240,
    opacity: 0,
    rotate: direction > 0 ? 4 : -4,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotate: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 240 : -240,
    opacity: 0,
    rotate: direction < 0 ? -4 : 4,
    scale: 0.96,
  }),
}

const SwipeCarousel: React.FC = () => {
  const { state, acceptMatch, declineMatch, refreshMatches } = useAppStore()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const pendingSync = state.pendingMatchActions.length
  const hasCachedMatches = state.matches.status === 'error' && state.matches.data.length > 0

  const queue = useMemo(
    () => state.matches.data.filter((item) => item.status === 'pending'),
    [state.matches.data],
  )

  useEffect(() => {
    if (queue.length === 0) {
      setIndex(0)
      return
    }
    setIndex((currentIndex) => {
      if (currentIndex >= queue.length) {
        return Math.max(queue.length - 1, 0)
      }
      return currentIndex
    })
  }, [queue.length])

  const current = queue[index]

  const handleSwipe = useCallback(
    async (match: MatchFeedItem, decision: 'like' | 'pass') => {
      setDirection(decision === 'like' ? 1 : -1)
      setIndex((currentIndex) => Math.min(currentIndex + 1, Math.max(queue.length - 1, 0)))
      try {
        if (decision === 'like') {
          await acceptMatch(match.id)
        } else {
          await declineMatch(match.id)
        }
      } catch (error) {
        // rollback UI position only if we still have the match in queue
        setIndex((currentIndex) => {
          if (queue[currentIndex]?.id === match.id) {
            return currentIndex
          }
          return Math.max(currentIndex - 1, 0)
        })
        if (import.meta.env.DEV) {
          console.warn('Unable to perform swipe action', error)
        }
      }
    },
    [acceptMatch, declineMatch, queue],
  )

  if (state.matches.status === 'loading' && state.matches.data.length === 0) {
    return <div className="loading">Recherche de profils pertinents…</div>
  }

  if (state.matches.status === 'error' && !hasCachedMatches) {
    return (
      <div className="error-state" role="alert">
        Impossible de récupérer les matchs. <button onClick={refreshMatches}>Réessayer</button>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="empty-state">
        <p>Aucun nouveau profil à présenter pour le moment.</p>
        <button type="button" className="secondary" onClick={refreshMatches}>
          Actualiser le flux
        </button>
        {pendingSync > 0 && (
          <p className="hint">{pendingSync} action(s) seront synchronisées dès que la connexion reviendra.</p>
        )}
      </div>
    )
  }

  return (
    <div className="swipe-carousel" aria-live="polite">
      {hasCachedMatches && (
        <div className="notice" role="status">
          Mode hors-ligne – affichage des recommandations en cache.
        </div>
      )}
      {pendingSync > 0 && (
        <div className="notice" role="status">
          {pendingSync} action(s) en attente de synchronisation…
        </div>
      )}
      <AnimatePresence custom={direction} initial={false} mode="wait">
        <motion.div
          key={current.id}
          className="swipe-carousel__card"
          custom={direction}
          variants={swipeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <MatchCard
            suggestion={current}
            onAccept={() => handleSwipe(current, 'like')}
            onDecline={() => handleSwipe(current, 'pass')}
          />
        </motion.div>
      </AnimatePresence>
      <div className="swipe-carousel__actions">
        <button type="button" className="secondary" onClick={() => handleSwipe(current, 'pass')}>
          Passer
        </button>
        <button type="button" className="primary" onClick={() => handleSwipe(current, 'like')}>
          Entrer en contact
        </button>
      </div>
    </div>
  )
}

export default SwipeCarousel
