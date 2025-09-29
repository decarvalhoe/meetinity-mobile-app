import React from 'react'
import ScreenState, { type ScreenStateProps } from './ScreenState'

interface ErrorStateProps extends Omit<ScreenStateProps, 'tone'> {
  onRetry?: () => void
  retryLabel?: string
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Une erreur est survenue',
  description = "Veuillez réessayer dans un instant.",
  icon = '⚠️',
  onRetry,
  retryLabel = 'Réessayer',
  actions,
  ...rest
}) => {
  const retryButton =
    onRetry != null ? (
      <button type="button" className="secondary" onClick={onRetry}>
        {retryLabel}
      </button>
    ) : null

  return (
    <ScreenState
      tone="error"
      title={title}
      description={description}
      icon={icon}
      role="alert"
      actions={
        <>
          {retryButton}
          {actions}
        </>
      }
      {...rest}
    />
  )
}

export default ErrorState
