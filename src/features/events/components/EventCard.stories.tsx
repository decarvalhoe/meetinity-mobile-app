import type { Meta, StoryObj } from '@storybook/react'
import EventCard from './EventCard'
import type { EventSummary } from '../types'

const baseEvent: EventSummary = {
  id: 'event-1',
  title: 'Atelier DesignOps',
  description: 'Un atelier interactif pour améliorer la collaboration produit/design.',
  location: 'Lyon',
  startAt: new Date().toISOString(),
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
  args: {
    event: baseEvent,
  },
  parameters: {
    layout: 'padded',
  },
}

export default meta

type Story = StoryObj<typeof EventCard>

export const Disponible: Story = {}

export const Inscrit: Story = {
  args: {
    event: {
      ...baseEvent,
      isRegistered: true,
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
}

export const Synchronisation: Story = {
  args: {
    isProcessing: true,
  },
}
