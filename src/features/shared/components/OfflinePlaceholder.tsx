import React from 'react'
import ScreenState, { type ScreenStateProps } from './ScreenState'

interface OfflinePlaceholderProps extends Omit<ScreenStateProps, 'tone'> {
  onRetry?: () => void
  retryLabel?: string
}

const OfflinePlaceholder: React.FC<OfflinePlaceholderProps> = ({
  title = 'Vous êtes hors ligne',
  description = 'Certaines informations peuvent être indisponibles.',
  icon = '📡',
  onRetry,
  retryLabel = 'Réessayer',
  actions,
  ...rest
}) => {
  const retryAction =
    onRetry != null ? (
      <button type="button" className="secondary" onClick={onRetry}>
        {retryLabel}
      </button>
    ) : null

  return (
    <ScreenState
      tone="warning"
      title={title}
      description={description}
      icon={icon}
      role="status"
      actions={
        <>
          {retryAction}
          {actions}
        </>
      }
      {...rest}
    />
  )
}

export default OfflinePlaceholder
