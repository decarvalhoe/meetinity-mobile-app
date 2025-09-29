import type { Meta, StoryObj } from '@storybook/react'
import ScreenState from './ScreenState'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import OfflinePlaceholder from './OfflinePlaceholder'
import SkeletonBlock from './SkeletonBlock'

const meta: Meta<typeof ScreenState> = {
  title: 'Design System/États d’écran',
  component: ScreenState,
  parameters: {
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof ScreenState>

export const Information: Story = {
  args: {
    title: 'Aucune donnée',
    description: "Revenez plus tard ou modifiez vos filtres pour afficher du contenu.",
    tone: 'info',
    icon: 'ℹ️',
  },
}

export const Succès: Story = {
  args: {
    title: 'Action réalisée',
    description: 'Votre demande a été synchronisée avec succès.',
    tone: 'success',
    icon: '✅',
  },
}

export const Erreur: StoryObj<typeof ErrorState> = {
  render: (args) => <ErrorState {...args} />,
  args: {
    title: 'Une erreur est survenue',
    description: 'Impossible de charger vos informations pour le moment.',
  },
}

export const Chargement: StoryObj<typeof LoadingState> = {
  render: (args) => <LoadingState {...args} />,
  args: {
    title: 'Chargement des données',
    description: 'Merci de patienter pendant la récupération des contenus.',
    skeleton: (
      <div className="skeleton-group" style={{ width: '320px' }}>
        <div className="skeleton-card">
          <div className="skeleton-card__header">
            <SkeletonBlock width={48} height={48} shape="circle" />
            <div className="skeleton-group">
              <SkeletonBlock height={14} width="70%" />
              <SkeletonBlock height={12} width="45%" />
            </div>
          </div>
          <div className="skeleton-card__body">
            <SkeletonBlock height={12} />
            <SkeletonBlock height={12} width="80%" />
            <SkeletonBlock height={12} width="60%" />
          </div>
        </div>
      </div>
    ),
  },
}

export const HorsLigne: StoryObj<typeof OfflinePlaceholder> = {
  render: (args) => <OfflinePlaceholder {...args} />,
  args: {
    title: 'Mode hors ligne',
    description: 'Certaines fonctions seront à nouveau disponibles une fois connecté.',
  },
}
