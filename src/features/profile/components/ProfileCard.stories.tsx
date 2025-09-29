import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import type { ProfilePreferences, UserProfile } from '../types'
import ProfileCard from './ProfileCard'

const exampleProfile: UserProfile = {
  id: 'user-1',
  fullName: 'Camille Dupont',
  headline: 'Chef de projet numérique',
  bio: 'Passionnée par les expériences collaboratives et les communautés tech.',
  avatarUrl: undefined,
  interests: ['Innovation', 'UX', 'Management'],
  skills: ['Product discovery', 'Agilité', 'Leadership'],
  location: 'Paris, France',
  availability: 'En soirée et le week-end',
  company: 'Meetinity',
  position: 'Lead Produit',
  links: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/camille-dupont' },
    { label: 'Portfolio', url: 'https://camille.design' },
  ],
}

const preferenceHighlight: ProfilePreferences = {
  discoveryRadiusKm: 15,
  industries: ['SaaS', 'Design'],
  interests: ['Innovation', 'Tech for Good'],
  eventTypes: ['Atelier', 'Meetup'],
}

const meta: Meta<typeof ProfileCard> = {
  title: 'Composants/Profil/ProfileCard',
  component: ProfileCard,
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
    profile: exampleProfile,
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Carte profil affichée dans les flux et les listes. Elle expose l'avatar, les champs sociaux et les listes d'intérêts avec des puces accessibles.",
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof ProfileCard>

export const ProfilComplet: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Utiliser pour présenter un profil complet. La lettre de secours dans l'avatar garantit un repère visuel lorsque la photo est absente.",
      },
    },
  },
}

export const AvecPhoto: Story = {
  args: {
    profile: {
      ...exampleProfile,
      avatarUrl: 'https://i.pravatar.cc/160?u=camille-dupont',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Illustration de l'avatar chargé depuis le réseau. Conserver un texte alternatif descriptif pour les technologies d'assistance.",
      },
    },
  },
}

export const PréférencesPartagées: Story = {
  args: {
    profile: {
      ...exampleProfile,
      preferences: preferenceHighlight,
    },
    preferences: preferenceHighlight,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Affiche à la fois les préférences du profil et celles de la session pour mettre en avant les intérêts communs. Les puces utilisent des contrastes AA.",
      },
    },
  },
}

export const AppelÀAction: Story = {
  args: {
    onEdit: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "La commande \"Modifier\" est un bouton de type bouton et conserve un focus visible via les tokens de thème.",
      },
    },
  },
}

export const ProfilMinimal: Story = {
  args: {
    profile: {
      id: 'user-2',
      fullName: 'Alex Martin',
      headline: 'Membre Meetinity',
      interests: ['Community'],
      bio: undefined,
      skills: undefined,
      location: undefined,
      availability: undefined,
      company: undefined,
      position: undefined,
      links: [],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Exemple de profil minimal où seules les informations essentielles sont affichées sans créer de lacunes visuelles.",
      },
    },
  },
}

