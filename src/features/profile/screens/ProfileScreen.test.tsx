import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import ProfileScreen from './ProfileScreen'
import type { AppState, AppStoreValue } from '../../../store/AppStore'
import { appCache } from '../../../lib/cache'

const mockUseAppStore = vi.fn()
const getPreferencesMock = vi.fn().mockResolvedValue({
  discoveryRadiusKm: 25,
  industries: [],
  interests: [],
  eventTypes: [],
})

vi.mock('../../../store/AppStore', () => ({
  useAppStore: () => mockUseAppStore(),
}))

vi.mock('../../../services/profileService', () => ({
  default: {
    getPreferences: (...args: unknown[]) => getPreferencesMock(...args),
  },
}))

const profile = {
  id: 'user-1',
  fullName: 'Jane Doe',
  headline: 'Product Manager',
  interests: ['Tech'],
}

const createBaseState = (): AppState => ({
  profile: { status: 'success', data: profile },
  matches: { status: 'idle', data: [] },
  events: {
    status: 'idle',
    data: { items: [], page: 1, pageSize: 20, total: 0, hasMore: false, filters: {} },
  },
  conversations: { status: 'idle', data: [] },
  messages: {},
  activeConversationId: null,
  pendingMessages: [],
  messagingRealtime: { status: 'disconnected', sessionId: null, since: null, presence: {} },
  matchFeedMeta: null,
  pendingMatchActions: [],
  matchNotifications: [],
  messageNotifications: [],
  eventDetails: {},
  pendingEventRegistrations: [],
  notificationPermission: 'default',
})

const createState = (overrides: Partial<AppState>): AppState => ({
  ...createBaseState(),
  ...overrides,
})

type StoreStub = Pick<
  AppStoreValue,
  |
    'state'
    | 'refreshProfile'
    | 'saveProfile'
    | 'refreshMatches'
    | 'acceptMatch'
    | 'declineMatch'
    | 'refreshEvents'
    | 'toggleEventRegistration'
    | 'refreshConversations'
    | 'loadMessages'
    | 'sendMessage'
    | 'setActiveConversation'
    | 'acknowledgeMatchNotification'
    | 'acknowledgeMessageNotification'
    | 'requestNotificationPermission'
    | 'ensureNotificationPermission'
>

const createStore = (overrides: Partial<StoreStub> = {}): StoreStub => {
  const base: StoreStub = {
    state: createBaseState(),
    refreshProfile: vi.fn(async () => {}),
    saveProfile: vi.fn(async () => {}),
    refreshMatches: vi.fn(async () => {}),
    acceptMatch: vi.fn(async () => {}),
    declineMatch: vi.fn(async () => {}),
    refreshEvents: vi.fn(async () => {}),
    toggleEventRegistration: vi.fn(async () => {}),
    refreshConversations: vi.fn(async () => {}),
    loadMessages: vi.fn(async () => {}),
    sendMessage: vi.fn(async () => {}),
    setActiveConversation: vi.fn(),
    acknowledgeMatchNotification: vi.fn(),
    acknowledgeMessageNotification: vi.fn(),
    requestNotificationPermission: vi.fn(async () => 'default'),
    ensureNotificationPermission: vi.fn(),
  }

  return {
    ...base,
    ...overrides,
    state: overrides.state ?? base.state,
  }
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockUseAppStore.mockReset()
    appCache.clear()
  })

  it('render loading state while profile is being fetched', () => {
    const refreshProfile = vi.fn()
    mockUseAppStore.mockReturnValue(
      createStore({
        state: createState({ profile: { status: 'loading', data: null } }),
        refreshProfile,
      }),
    )

    render(<ProfileScreen />)

    expect(screen.getByText('Chargement du profil')).toBeInTheDocument()
    expect(refreshProfile).not.toHaveBeenCalled()
  })

  it('triggers refresh when profile state is idle', () => {
    const refreshProfile = vi.fn()
    mockUseAppStore.mockReturnValue(
      createStore({
        state: createState({ profile: { status: 'idle', data: null } }),
        refreshProfile,
      }),
    )

    render(<ProfileScreen />)

    expect(refreshProfile).toHaveBeenCalled()
  })

  it('allows switching to edit mode', () => {
    mockUseAppStore.mockReturnValue(
      createStore({ saveProfile: vi.fn().mockResolvedValue(undefined) }),
    )

    render(<ProfileScreen />)

    fireEvent.click(screen.getByText('Modifier'))

    expect(screen.getByLabelText('Nom complet')).toHaveValue('Jane Doe')
  })

  it('blocks saving and shows validation errors when the form is invalid', async () => {
    const saveProfile = vi.fn().mockResolvedValue(undefined)
    const profileWithPreferences = {
      ...profile,
      preferences: { discoveryRadiusKm: 20, industries: [], interests: [], eventTypes: [] },
    }

    mockUseAppStore.mockReturnValue(
      createStore({
        state: createState({ profile: { status: 'success', data: profileWithPreferences } }),
        saveProfile,
      }),
    )

    render(<ProfileScreen />)

    fireEvent.click(screen.getByText('Modifier'))

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'a'.repeat(350) } })
    fireEvent.change(screen.getByLabelText('Intérêts (séparés par des virgules)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Rayon de découverte (km)'), { target: { value: '-5' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un lien' }))
    const linksFieldset = await screen.findByRole('group', { name: 'Liens publics' })
    const linkLabelInput = within(linksFieldset).getByLabelText('Libellé')
    const linkUrlInput = within(linksFieldset).getByLabelText('URL')
    fireEvent.change(linkLabelInput, { target: { value: 'Portfolio' } })
    fireEvent.change(linkUrlInput, { target: { value: 'notaurl' } })

    expect(screen.getByText('La bio ne doit pas dépasser 280 caractères.')).toBeInTheDocument()

    fireEvent.submit(screen.getByRole('form', { name: 'Édition du profil' }))

    expect(saveProfile).not.toHaveBeenCalled()
    expect(screen.getByText('Le nom complet est requis.')).toBeInTheDocument()
    expect(screen.getByText('Le titre est requis.')).toBeInTheDocument()
    expect(screen.getByText('Ajoutez au moins un intérêt.')).toBeInTheDocument()
    expect(screen.getByText("L'URL doit être valide.")).toBeInTheDocument()
    expect(screen.getByText('Indiquez un rayon valide (en kilomètres).')).toBeInTheDocument()
  })

  it('saves the profile when the form passes validation', async () => {
    const saveProfile = vi.fn().mockResolvedValue(undefined)

    mockUseAppStore.mockReturnValue(
      createStore({
        saveProfile,
        state: createState({ profile: { status: 'success', data: { ...profile, preferences: null } } }),
      }),
    )

    render(<ProfileScreen />)

    fireEvent.click(screen.getByText('Modifier'))

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Jane Updated' } })
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Head of Product' } })
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'Bio mise à jour' } })
    fireEvent.change(screen.getByLabelText('Rayon de découverte (km)'), { target: { value: '30' } })

    fireEvent.submit(screen.getByRole('form', { name: 'Édition du profil' }))

    await waitFor(() => expect(saveProfile).toHaveBeenCalled())
  })
})
