import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import type { Message, QueuedMessage } from '../types'
import MessageTimeline from './MessageTimeline'

const baseDate = new Date('2024-05-14T18:00:00Z')

const createMessage = (overrides: Partial<Message>): Message => ({
  id: `msg-${overrides.id ?? Math.random().toString(16).slice(2)}`,
  conversationId: 'conv-1',
  senderId: overrides.senderId ?? 'user-1',
  content: overrides.content ?? 'Message',
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  status: overrides.status ?? 'sent',
  attachments: overrides.attachments,
  clientGeneratedId: overrides.clientGeneratedId,
})

const teamMessages: Message[] = [
  createMessage({
    id: '1',
    senderId: 'user-1',
    content: 'Salut 👋 On se retrouve demain à l’atelier?',
    createdAt: new Date(baseDate.getTime() - 1000 * 60 * 12).toISOString(),
    status: 'read',
    clientGeneratedId: 'local-1',
  }),
  createMessage({
    id: '2',
    senderId: 'user-2',
    content: 'Oui ! Je ramène les retours utilisateurs de la semaine.',
    createdAt: new Date(baseDate.getTime() - 1000 * 60 * 8).toISOString(),
    status: 'delivered',
  }),
  createMessage({
    id: '3',
    senderId: 'user-1',
    content: 'Parfait, on préparera un board synthèse.',
    createdAt: new Date(baseDate.getTime() - 1000 * 60 * 3).toISOString(),
    status: 'sent',
    clientGeneratedId: 'local-3',
  }),
]

const attachmentMessage: Message[] = [
  createMessage({
    id: '4',
    senderId: 'user-2',
    content: 'Voici les slides de la présentation',
    createdAt: new Date(baseDate.getTime() - 1000 * 60 * 5).toISOString(),
    status: 'delivered',
    attachments: [
      {
        id: 'att-1',
        name: 'Synthèse Atelier.pdf',
        url: 'https://example.com/synthese.pdf',
      },
      {
        id: 'att-2',
        name: 'Capture.png',
        previewUrl: 'https://via.placeholder.com/120x80.png?text=Aperçu',
      },
    ],
  }),
  createMessage({
    id: '5',
    senderId: 'user-1',
    content: 'Merci beaucoup, je relis ça dans la foulée.',
    createdAt: new Date(baseDate.getTime() - 1000 * 60 * 2).toISOString(),
    status: 'read',
  }),
]

const pendingQueue: QueuedMessage[] = [
  {
    id: 'queue-1',
    conversationId: 'conv-1',
    clientGeneratedId: 'local-3',
    content: 'Parfait, on préparera un board synthèse.',
    attachments: [],
    createdAt: teamMessages[2].createdAt,
    attempts: 1,
    status: 'sending',
  },
  {
    id: 'queue-2',
    conversationId: 'conv-1',
    clientGeneratedId: 'local-4',
    content: 'Je peux aussi inviter Léa si tu veux.',
    attachments: [],
    createdAt: new Date(baseDate.getTime() - 1000 * 60).toISOString(),
    attempts: 3,
    status: 'failed',
    error: 'Connexion perdue',
  },
]

const messagesWithPending: Message[] = [
  ...teamMessages,
  createMessage({
    id: '4',
    senderId: 'user-1',
    content: 'Je peux aussi inviter Léa si tu veux.',
    createdAt: pendingQueue[1].createdAt,
    status: 'sent',
    clientGeneratedId: 'local-4',
  }),
]

const meta: Meta<typeof MessageTimeline> = {
  title: 'Composants/Messagerie/MessageTimeline',
  component: MessageTimeline,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 480 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  args: {
    messages: teamMessages,
    currentUserId: 'user-1',
    onRetry: fn(),
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Timeline de messages asynchrone. Les bulles sortantes/incoming reposent sur les tokens de couleur et la meta annonce les statuts de livraison.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof MessageTimeline>

export const ConversationActive: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Affiche un échange classique. Les libellés \"Lu\" et \"Reçu\" sont concaténés dans le texte pour rester lisibles par les lecteurs d'écran.",
      },
    },
  },
}

export const AvecPiecesJointes: Story = {
  args: {
    messages: attachmentMessage,
    currentUserId: 'user-2',
  },
  parameters: {
    docs: {
      description: {
        story:
          "Illustration d'une pièce jointe avec lien externe. Les ancres restent activables au clavier et les libellés reprennent le nom du fichier.",
      },
    },
  },
}

export const EnvoiEnCours: Story = {
  args: {
    messages: messagesWithPending,
    pendingMessages: pendingQueue,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Montre les états \"Envoi…\" et \"Échec de l’envoi\". Le bouton de réessai déclenche `onRetry` et porte une étiquette explicite.",
      },
    },
  },
}

export const ToutLu: Story = {
  args: {
    messages: teamMessages.map((message) => ({ ...message, status: 'read' })),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Vue après lecture complète, utile pour documenter les badges de confirmation et vérifier le contraste du texte secondaire.",
      },
    },
  },
}

