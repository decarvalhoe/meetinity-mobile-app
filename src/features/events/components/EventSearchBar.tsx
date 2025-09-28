import React from 'react'
import type { EventSortOption } from '../types'
import '../../shared.css'

interface EventSearchBarProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: (query: string) => void
  suggestions: string[]
  onSelectSuggestion: (value: string) => void
  sort: EventSortOption
  onSortChange: (value: EventSortOption) => void
  isLoading?: boolean
}

const EventSearchBar: React.FC<EventSearchBarProps> = ({
  query,
  onQueryChange,
  onSubmit,
  suggestions,
  onSelectSuggestion,
  sort,
  onSortChange,
  isLoading,
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(query)
  }

  return (
    <div className="event-search-bar">
      <form className="event-search-bar__form" onSubmit={handleSubmit}>
        <label htmlFor="event-search-input" className="event-search-bar__label">
          Rechercher
        </label>
        <div className="event-search-bar__controls">
          <input
            id="event-search-input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher par titre, lieu ou mot-clé"
          />
          <button type="submit" className="primary">
            {isLoading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
        <label htmlFor="event-sort" className="event-search-bar__label">
          Tri
        </label>
        <select
          id="event-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as EventSortOption)}
        >
          <option value="upcoming">À venir</option>
          <option value="recent">Les plus récents</option>
          <option value="popular">Populaires</option>
        </select>
      </form>
      {suggestions.length > 0 && query && (
        <ul className="event-search-bar__suggestions" role="listbox" aria-label="Suggestions de recherche">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button type="button" onClick={() => onSelectSuggestion(suggestion)}>
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default EventSearchBar
