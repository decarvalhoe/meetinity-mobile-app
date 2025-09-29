import type { Meta, StoryObj } from '@storybook/react'
import { ThemeProvider } from '../../../theme/ThemeProvider'
import type { ProfileDraft, UserProfile } from '../types'
import type { PhotoUploadState } from '../services/photoUpload'
import ProfileEditor from './ProfileEditor'

const baseProfile: UserProfile = {
  id: 'user-1',
  fullName: 'Camille Dupont',
  headline: 'Lead Produit',
  avatarUrl: 'https://i.pravatar.cc/160?u=camille-dupont',
  bio: 'J’aide les équipes à structurer leur discovery produit et à connecter les communautés locales.',
  interests: ['Innovation', 'UX', 'Leadership'],
  company: 'Meetinity',
  position: 'Head of Product',
  location: 'Paris, France',
  availability: 'En soirée',
  skills: ['Product discovery', 'Facilitation', 'DesignOps'],
  experiences: [
    {
      id: 'exp-1',
      title: 'Head of Product',
      company: 'Meetinity',
      startDate: '2022-01-01',
      description: 'Pilotage de la stratégie produit et des communautés locales.',
    },
    {
      id: 'exp-2',
      title: 'Product Manager',
      company: 'WeLoveTech',
      startDate: '2019-01-01',
      endDate: '2021-12-31',
      description: 'Animation des roadmaps et mise en place des OKR.',
    },
  ],
  links: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/camille-dupont' },
    { label: 'Portfolio', url: 'https://camille.design' },
  ],
  preferences: {
    discoveryRadiusKm: 20,
    industries: ['SaaS', 'Événementiel'],
    interests: ['Innovation', 'Tech for Good'],
    eventTypes: ['Meetup', 'Atelier'],
  },
}

const createDraft = (): ProfileDraft => ({
  profile: {
    fullName: baseProfile.fullName,
    headline: baseProfile.headline,
    bio: baseProfile.bio,
    interests: baseProfile.interests,
    location: baseProfile.location,
    availability: baseProfile.availability,
    company: baseProfile.company,
    position: baseProfile.position,
    skills: baseProfile.skills,
    experiences: baseProfile.experiences,
    links: baseProfile.links,
  },
  preferences: {
    discoveryRadiusKm: baseProfile.preferences?.discoveryRadiusKm,
    industries: baseProfile.preferences?.industries,
    interests: baseProfile.preferences?.interests,
    eventTypes: baseProfile.preferences?.eventTypes,
  },
  updatedAt: '2024-03-18T08:00:00.000Z',
})

const idleAvatarState: PhotoUploadState = {
  status: 'idle',
  draft: null,
}

const croppingAvatarState: PhotoUploadState = {
  status: 'cropping',
  draft: {
    id: 'draft-1',
    dataUrl: 'https://i.pravatar.cc/160?u=crop-preview',
    fileName: 'avatar.png',
    mimeType: 'image/png',
    size: 12800,
    crop: { x: 0, y: 0, width: 1, height: 1, scale: 1.2, rotation: 0 },
    status: 'cropping',
    updatedAt: '2024-03-18T08:30:00.000Z',
  },
  previewUrl: 'https://i.pravatar.cc/160?u=crop-preview',
  resumable: true,
}

const meta: Meta<typeof ProfileEditor> = {
  title: 'Composants/Profil/ProfileEditor',
  component: ProfileEditor,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 900 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  args: {
    profile: baseProfile,
    draft: createDraft(),
    avatarState: idleAvatarState,
    onFieldChange: () => {},
    onPreferenceChange: () => {},
    onAvatarSelect: async () => {},
    onAvatarCrop: () => {},
    onAvatarConfirm: () => {},
    onAvatarReset: () => {},
    onSave: async () => {},
    onCancel: () => {},
    busy: false,
    error: null,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "Formulaire complet d'édition du profil. Chaque champ est étiqueté et relié à son message d'erreur pour l'accessibilité.",
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof ProfileEditor>

export const EditionComplète: Story = {
  args: {
    draft: createDraft(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Vue par défaut avec toutes les sections remplies. Les sections dynamiques (expériences, liens) affichent une aide textuelle lorsque la liste est vide.",
      },
    },
  },
}

export const RecadrageAvatar: Story = {
  args: {
    draft: createDraft(),
    avatarState: croppingAvatarState,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Montre le panneau de recadrage. Les contrôles utilisent des entrées natives et restent accessibles au clavier.",
      },
    },
  },
}

export const SauvegardeEnCours: Story = {
  args: {
    draft: createDraft(),
    busy: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "La soumission désactive l'ensemble des commandes et remplace le libellé du bouton par un état de progression.",
      },
    },
  },
}

export const ErreurDeSoumission: Story = {
  args: {
    draft: createDraft(),
    error: "Impossible d'enregistrer les modifications. Merci de réessayer.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Un message avec rôle `alert` est affiché en cas d'échec serveur afin d'être annoncé par les lecteurs d'écran.",
      },
    },
  },
}

export const ProfilAllégé: Story = {
  args: {
    draft: {
      profile: {
        fullName: 'Alex Martin',
        headline: 'Nouveau membre',
        interests: ['Networking'],
        bio: '',
        location: 'Lille, France',
        availability: 'Week-ends',
        company: '',
        position: '',
        skills: [],
        experiences: [],
        links: [],
      },
      preferences: {
        discoveryRadiusKm: 10,
        industries: [],
        interests: [],
        eventTypes: ['Meetup'],
      },
      updatedAt: '2024-03-01T12:00:00.000Z',
    },
    profile: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Cas d'un profil en création où les sections facultatives s'affichent avec des invites légères pour guider l'utilisateur.",
      },
    },
  },
}

