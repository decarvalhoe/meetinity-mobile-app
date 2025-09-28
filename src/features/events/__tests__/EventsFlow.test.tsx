import { fireEvent, render, screen, within } from '@testing-library/react'
import React, { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import EventListScreen from '../screens/EventListScreen'
import EventDetailScreen from '../screens/EventDetailScreen'
import MyEventsScreen from '../screens/MyEventsScreen'

const mockUseAppStore = vi.fn()

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

const createBaseStore = () => ({
  state: {
    profile: { status: 'success', data: { id: 'user-1', fullName: 'Tester', headline: '', interests: [] } },
    matches: { status: 'success', data: [] },
    events: {
      status: 'success',
      data: {
        items: [],
        page: 1,
        pageSize: 10,
        total: 0,
        hasMore: false,
        filters: {},
      },
    },
    conversations: { status: 'idle', data: [] },
    messages: {},
    activeConversationId: null,
    matchFeedMeta: null,
    pendingMatchActions: [],
    matchNotifications: [],
    eventDetails: {},
    pendingEventRegistrations: [],
  },
  refreshProfile: vi.fn(),
  saveProfile: vi.fn(),
  refreshMatches: vi.fn(),
  acceptMatch: vi.fn(),
  declineMatch: vi.fn(),
  refreshEvents: vi.fn(),
  toggleEventRegistration: vi.fn(),
  loadEventDetails: vi.fn(),
  refreshConversations: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(),
  setActiveConversation: vi.fn(),
  acknowledgeMatchNotification: vi.fn(),
})

describe('Events flow screens', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
  })

  it('refreshes event list on mount when idle', () => {
    const store = createBaseStore()
    store.state.events.status = 'idle'
    const refreshEvents = vi.fn()
    store.refreshEvents = refreshEvents
    mockUseAppStore.mockReturnValue(store)

    render(
      <MemoryRouter>
        <EventListScreen />
      </MemoryRouter>,
    )

    expect(refreshEvents).toHaveBeenCalledWith({ sort: 'upcoming' }, 1)
  })

  it('applies filters, search and displays suggestions', () => {
    const store = createBaseStore()
    const event = {
      id: 'event-1',
      title: 'Afterwork Paris',
      description: 'Networking',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Paris',
      capacity: 30,
      attendingCount: 10,
      category: { id: 'afterwork', name: 'Afterwork' },
      isRegistered: false,
    }
    store.state.events.data.items = [event]
    store.state.events.data.total = 1
    const refreshEvents = vi.fn()
    store.refreshEvents = refreshEvents
    mockUseAppStore.mockReturnValue(store)

    render(
      <MemoryRouter>
        <EventListScreen />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Lieu'), { target: { value: 'Paris' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Filtrer' }).closest('form') as HTMLFormElement)

    expect(refreshEvents).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'Paris', sort: 'upcoming' }),
      1,
    )

    refreshEvents.mockClear()

    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'After' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }))

    expect(refreshEvents).toHaveBeenCalledWith(expect.objectContaining({ search: 'After' }), 1)

    const suggestionList = screen.getByRole('listbox', { name: /suggestions/i })
    const suggestionButton = within(suggestionList).getByRole('button', { name: 'Afterwork Paris' })
    refreshEvents.mockClear()
    fireEvent.click(suggestionButton)

    expect(refreshEvents).toHaveBeenCalledWith(expect.objectContaining({ search: 'Afterwork Paris' }), 1)

    refreshEvents.mockClear()
    fireEvent.change(screen.getByLabelText('Tri'), { target: { value: 'popular' } })

    expect(refreshEvents).toHaveBeenCalledWith(expect.objectContaining({ sort: 'popular' }), 1)
  })

  it('renders event details and toggles registration', async () => {
    const store = createBaseStore()
    const detail = {
      id: 'event-1',
      title: 'Conférence IA',
      description: 'Exploration de l’IA',
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      location: 'Lyon',
      capacity: 100,
      attendingCount: 42,
      category: { id: 'conf', name: 'Conférences' },
      agenda: 'Agenda détaillé',
      speakers: ['Alice', 'Bob'],
      organizer: { id: 'org-1', name: 'Meetinity' },
      participants: [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ],
      isRegistered: false,
    }
    store.state.events.data.items = [detail]
    store.state.eventDetails = { 'event-1': detail }
    store.loadEventDetails = vi.fn().mockResolvedValue(detail)
    const toggleEventRegistration = vi.fn().mockResolvedValue(undefined)
    store.toggleEventRegistration = toggleEventRegistration
    mockUseAppStore.mockReturnValue(store)

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/events/event-1']}>
          <Routes>
            <Route path="/events/:eventId" element={<EventDetailScreen />} />
          </Routes>
        </MemoryRouter>,
      )
      await Promise.resolve()
    })

    expect(await screen.findByText('Conférence IA')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Organisateur' })).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: "S'inscrire" }))
    })

    expect(toggleEventRegistration).toHaveBeenCalledWith('event-1', true)
  })

  it('displays offline information in my events view', () => {
    const store = createBaseStore()
    store.state.events.status = 'error'
    store.state.events.data.items = [
      {
        id: 'event-2',
        title: 'Atelier UX',
        description: 'Design',
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
        location: 'Bordeaux',
        capacity: 20,
        attendingCount: 5,
        isRegistered: true,
      },
    ]
    mockUseAppStore.mockReturnValue(store)

    const originalOnline = Object.getOwnPropertyDescriptor(window.navigator, 'onLine')
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })

    render(
      <MemoryRouter>
        <MyEventsScreen />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mode hors connexion/)).toBeInTheDocument()
    expect(screen.getByText('Atelier UX')).toBeInTheDocument()

    if (originalOnline) {
      Object.defineProperty(window.navigator, 'onLine', originalOnline)
    }
  })
})
