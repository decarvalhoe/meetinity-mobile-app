import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import type { EventSummary } from '../types'
import EventCard from './EventCard'

const baseEvent: EventSummary = {
  id: 'event-1',
  title: 'Atelier DesignOps',
  description: 'Un atelier interactif pour améliorer la collaboration produit/design.',
  location: 'Lyon',
  startAt: new Date('2024-05-14T18:30:00Z').toISOString(),
  capacity: 45,
  attendingCount: 23,
  isRegistered: false,
  category: {
    id: 'design',
    name: 'Design',
    color: '#f59e0b',
  },
}

const meta: Meta<typeof EventCard> = {
  title: 'Composants/Événements/EventCard',
  component: EventCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 420 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  args: {
    event: baseEvent,
    onToggleRegistration: fn(),
    onViewDetails: fn(),
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Carte d’événement affichant le titre, la catégorie et la jauge de participants. Les boutons respectent les contrastes AA et les états désactivés.",
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof EventCard>

export const Disponible: Story = {
  parameters: {
    docs: {
      description: {
        story: "État standard avec action d'inscription disponible.",
      },
    },
  },
}

export const Inscrit: Story = {
  args: {
    event: {
      ...baseEvent,
      isRegistered: true,
      attendingCount: 24,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Le bouton principal passe en \"Se désinscrire\" pour signaler l'état courant. Le focus reste visible même désactivé.",
      },
    },
  },
}

export const Complet: Story = {
  args: {
    event: {
      ...baseEvent,
      attendingCount: 45,
      isRegistered: false,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Lorsque la capacité est atteinte, le bouton est rendu inactif et annonce \"Complet\" aux lecteurs d'écran.",
      },
    },
  },
}

export const Synchronisation: Story = {
  args: {
    isProcessing: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Affiche l'étiquette de progression \"Synchronisation…\" pendant l'appel API afin d'informer les utilisateurs du statut.",
      },
    },
  },
}

export const SansLienSecondaire: Story = {
  args: {
    onViewDetails: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Utiliser lorsque la navigation secondaire n'est pas requise. La carte conserve un seul bouton primaire.",
      },
    },
  },
}

