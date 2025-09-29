import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import type { MatchSuggestion } from '../types'
import MatchCard from './MatchCard'

const baseSuggestion: MatchSuggestion = {
  id: 'match-1',
  compatibilityScore: 0.78,
  sharedInterests: ['Innovation', 'DesignOps', 'Communautés'],
  profile: {
    id: 'user-42',
    fullName: 'Lina Moreau',
    headline: 'UX Researcher',
    bio: 'Je mène des recherches qualitatives pour rapprocher designers et équipes produit.',
    interests: ['Innovation', 'DesignOps', 'Communautés'],
    location: 'Bordeaux',
    availability: 'Mardi et jeudi',
    company: 'CraftLab',
    position: 'UX Researcher',
    skills: ['Entretiens utilisateurs', 'Cartographie', 'Synthèse'],
    links: [{ label: 'Site', url: 'https://lina.research' }],
  },
}

const meta: Meta<typeof MatchCard> = {
  title: 'Composants/Découverte/MatchCard',
  component: MatchCard,
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
    suggestion: baseSuggestion,
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Carte des suggestions de rencontres. Les boutons \"Passer\" et \"Entrer en contact\" sont alignés sur les tokens primaires/secondaires du thème.",
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof MatchCard>

export const SuggestionStandard: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Cas par défaut affichant un pourcentage de compatibilité et les centres d'intérêt partagés.",
      },
    },
  },
}

export const CompatibilitéÉlevée: Story = {
  args: {
    suggestion: {
      ...baseSuggestion,
      compatibilityScore: 0.94,
      sharedInterests: ['Innovation', 'DesignOps', 'Accessibilité', 'CommunityOps'],
      profile: {
        ...baseSuggestion.profile,
        bio: 'Facilitatrice produit avec un fort tropisme pour la conception inclusive et les communautés tech.',
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Montre une bio plus longue et plusieurs puces d'intérêts. Les lecteurs d'écran énoncent le tag de compatibilité comme du texte simple.",
      },
    },
  },
}

export const SansActions: Story = {
  args: {
    onAccept: undefined,
    onDecline: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Utiliser lorsque la carte est affichée en aperçu. Les boutons ne sont pas rendus pour éviter de faux affordances.",
      },
    },
  },
}

export const ActionsJournalisées: Story = {
  args: {
    onAccept: fn(),
    onDecline: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Active les interactions. Les boutons possèdent des labels explicites et une zone de focus renforcée.",
      },
    },
  },
}

export const ProfilAvecLiens: Story = {
  args: {
    suggestion: {
      ...baseSuggestion,
      profile: {
        ...baseSuggestion.profile,
        links: [
          { label: 'LinkedIn', url: 'https://www.linkedin.com/in/lina-moreau' },
          { label: 'Portfolio', url: 'https://dribbble.com/lina-moreau' },
        ],
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Affiche plusieurs liens accessibles. Chaque ancre ouvre une nouvelle fenêtre et annonce la nature externe via `rel`.",
      },
    },
  },
}

