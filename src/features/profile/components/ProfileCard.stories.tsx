import type { Meta, StoryObj } from '@storybook/react'
import ProfileCard from './ProfileCard'
import type { UserProfile } from '../types'

const exampleProfile: UserProfile = {
  id: 'user-1',
  fullName: 'Camille Dupont',
  headline: 'Chef de projet numérique',
  bio: 'Passionnée par les expériences collaboratives et les communautés tech.',
  avatarUrl: '',
  interests: ['Innovation', 'UX', 'Management'],
  location: 'Paris, France',
  availability: 'En soirée et le week-end',
  links: [],
}

const meta: Meta<typeof ProfileCard> = {
  title: 'Composants/Profil/ProfileCard',
  component: ProfileCard,
  args: {
    profile: exampleProfile,
  },
}

export default meta

type Story = StoryObj<typeof ProfileCard>

export const ParDéfaut: Story = {}

export const AvecAvatar: Story = {
  args: {
    profile: {
      ...exampleProfile,
      avatarUrl: 'https://avatars.dicebear.com/api/initials/CD.svg',
    },
  },
}

export const AvecAction: Story = {
  args: {
    onEdit: () => alert('Édition du profil'),
  },
}
