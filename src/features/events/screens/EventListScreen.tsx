import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EventCard from '../components/EventCard'
import EventSearchBar from '../components/EventSearchBar'
import type { EventListFilters, EventSortOption } from '../types'
import { useAppStore } from '../../../store/AppStore'
import '../../shared.css'
import {
  ErrorState,
  LoadingState,
  OfflinePlaceholder,
  ScreenState,
  SkeletonBlock,
  useOnlineStatus,
} from '../../shared'

const DEFAULT_SORT: EventSortOption = 'upcoming'

const normalizeFilters = (filters: EventListFilters): EventListFilters => ({
  ...filters,
  sort: filters.sort ?? DEFAULT_SORT,
})

const EventListScreen: React.FC = () => {
  const navigate = useNavigate()
  const { state, refreshEvents, toggleEventRegistration } = useAppStore()
  const isOnline = useOnlineStatus()
  const [categoryId, setCategoryId] = useState(state.events.data.filters.categoryId ?? '')
  const [location, setLocation] = useState(state.events.data.filters.location ?? '')
  const [startDate, setStartDate] = useState(state.events.data.filters.startDate ?? '')
  const [endDate, setEndDate] = useState(state.events.data.filters.endDate ?? '')
  const [sort, setSort] = useState<EventSortOption>(state.events.data.filters.sort ?? DEFAULT_SORT)
  const [search, setSearch] = useState(state.events.data.filters.search ?? '')

  useEffect(() => {
    if (state.events.status === 'idle') {
      void refreshEvents(normalizeFilters(state.events.data.filters), 1)
    }
  }, [state.events.status, state.events.data.filters, refreshEvents])

  useEffect(() => {
    const filters = state.events.data.filters
    setCategoryId(filters.categoryId ?? '')
    setLocation(filters.location ?? '')
    setStartDate(filters.startDate ?? '')
    setEndDate(filters.endDate ?? '')
    setSort(filters.sort ?? DEFAULT_SORT)
    setSearch(filters.search ?? '')
  }, [state.events.data.filters])

  const buildFilters = (overrides: Partial<EventListFilters> = {}): EventListFilters => {
    const next: EventListFilters = {
      categoryId: overrides.categoryId ?? (categoryId || undefined),
      location: overrides.location ?? (location || undefined),
      startDate: overrides.startDate ?? (startDate || undefined),
      endDate: overrides.endDate ?? (endDate || undefined),
      sort: overrides.sort ?? sort ?? DEFAULT_SORT,
      search: overrides.search ?? (search.trim() ? search.trim() : undefined),
    }
    return normalizeFilters(next)
  }

  const handleFiltersSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void refreshEvents(buildFilters(), 1)
  }

  const handleSearchSubmit = (value: string) => {
    setSearch(value)
    void refreshEvents(buildFilters({ search: value.trim() ? value.trim() : undefined }), 1)
  }

  const handleSuggestionSelect = (value: string) => {
    setSearch(value)
    void refreshEvents(buildFilters({ search: value }), 1)
  }

  const handleSortChange = (value: EventSortOption) => {
    setSort(value)
    void refreshEvents(buildFilters({ sort: value }), 1)
  }

  const suggestions = useMemo(() => {
    if (!search) {
      return []
    }
    const pool = new Set<string>()
    state.events.data.items.forEach((event) => {
      if (event.title.toLowerCase().includes(search.toLowerCase())) {
        pool.add(event.title)
      }
      if (event.location.toLowerCase().includes(search.toLowerCase())) {
        pool.add(event.location)
      }
    })
    return Array.from(pool).slice(0, 5)
  }, [state.events.data.items, search])

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    state.events.data.items.forEach((event) => {
      if (event.category) {
        map.set(event.category.id, event.category.name)
      }
    })
    return Array.from(map.entries())
  }, [state.events.data.items])

  const pendingByEvent = useMemo(() => {
    const map = new Map<string, { pending: boolean; error?: string }>()
    state.pendingEventRegistrations.forEach((action) => {
      map.set(action.eventId, { pending: !action.error, error: action.error })
    })
    return map
  }, [state.pendingEventRegistrations])

  const isInitialLoading = state.events.status === 'loading' && state.events.data.items.length === 0
  const isPaginating = state.events.status === 'loading' && state.events.data.items.length > 0
  const hasError = state.events.status === 'error'

  const handleLoadMore = () => {
    void refreshEvents(state.events.data.filters, state.events.data.page + 1)
  }

  return (
    <section aria-labelledby="events-list-title" className="events-screen">
      <header className="section-header">
        <h1 id="events-list-title">Événements</h1>
        <button type="button" className="secondary" onClick={() => refreshEvents(state.events.data.filters, 1)}>
          Actualiser
        </button>
      </header>

      <EventSearchBar
        query={search}
        onQueryChange={setSearch}
        onSubmit={handleSearchSubmit}
        suggestions={suggestions}
        onSelectSuggestion={handleSuggestionSelect}
        sort={sort}
        onSortChange={handleSortChange}
        isLoading={state.events.status === 'loading'}
      />

      <form className="filters" onSubmit={handleFiltersSubmit}>
        <div className="filters__group">
          <label htmlFor="event-category">Catégorie</label>
          <select
            id="event-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Toutes</option>
            {categoryOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="filters__group">
          <label htmlFor="event-location">Lieu</label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ville"
          />
        </div>
        <div className="filters__group">
          <label htmlFor="event-start-date">À partir du</label>
          <input
            id="event-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div className="filters__group">
          <label htmlFor="event-end-date">Jusqu'au</label>
          <input
            id="event-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
        <div className="filters__actions">
          <button type="submit" className="primary">
            Filtrer
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setCategoryId('')
              setLocation('')
              setStartDate('')
              setEndDate('')
              setSort(DEFAULT_SORT)
              setSearch('')
              void refreshEvents(normalizeFilters({}), 1)
            }}
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {!isOnline && state.events.data.items.length === 0 && (
        <OfflinePlaceholder
          description="Reconnectez-vous pour voir les événements disponibles."
          onRetry={() => refreshEvents(state.events.data.filters, 1)}
        />
      )}

      {hasError && state.events.data.items.length === 0 && isOnline && (
        <ErrorState
          description={state.events.error ?? 'Impossible de récupérer les événements.'}
          onRetry={() => refreshEvents(state.events.data.filters, 1)}
        />
      )}

      {isInitialLoading ? (
        <LoadingState
          title="Chargement des événements"
          description="Nous récupérons les opportunités à venir."
          skeleton={
            <div className="skeleton-group">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="skeleton-card">
                  <div className="skeleton-card__header">
                    <div className="skeleton-group">
                      <SkeletonBlock height={18} width="60%" />
                      <SkeletonBlock height={14} width="40%" />
                    </div>
                    <SkeletonBlock height={20} width={96} />
                  </div>
                  <div className="skeleton-card__body">
                    <SkeletonBlock height={12} />
                    <SkeletonBlock height={12} width="80%" />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      ) : (
        <div className="events-grid">
          {state.events.data.items.map((event) => {
            const pendingInfo = pendingByEvent.get(event.id)
            return (
              <div key={event.id} className="events-grid__item">
                <EventCard
                  event={event}
                  onToggleRegistration={toggleEventRegistration}
                  onViewDetails={(eventId) => navigate(eventId)}
                  isProcessing={Boolean(pendingInfo?.pending)}
                />
                {pendingInfo?.error && (
                  <p className="error-state" role="status">
                    Action en attente de connexion ({pendingInfo.error})
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {state.events.data.items.length === 0 && !isInitialLoading && !hasError && (
        <ScreenState
          tone="info"
          title="Aucun événement disponible"
          description="Essayez d'élargir vos filtres ou revenez plus tard."
          actions={
            <button type="button" className="secondary" onClick={() => refreshEvents(normalizeFilters({}), 1)}>
              Réinitialiser les filtres
            </button>
          }
        />
      )}

      {state.events.data.hasMore && (
        <div className="pagination">
          <button type="button" className="secondary" onClick={handleLoadMore} disabled={isPaginating}>
            {isPaginating ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}

      {isPaginating && (
        <LoadingState inline title="Chargement supplémentaire" description="Nous ajoutons plus d'événements." />
      )}
    </section>
  )
}

export default EventListScreen
