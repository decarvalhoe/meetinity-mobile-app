import React from 'react'
import ScreenState, { type ScreenStateProps } from './ScreenState'

interface LoadingStateProps extends Omit<ScreenStateProps, 'tone'> {
  skeleton?: React.ReactNode
  inline?: boolean
}

const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Chargement…',
  description,
  icon = '⏳',
  skeleton,
  inline,
  className,
  ...rest
}) => {
  const classes = [className, inline ? 'state--inline' : undefined, 'state--loading']
    .filter(Boolean)
    .join(' ')

  const fallbackSkeleton = (
    <div className="skeleton-card" aria-hidden>
      <div className="skeleton-card__header">
        <span className="skeleton skeleton--circle" style={{ width: 48, height: 48 }} />
        <div className="skeleton-group">
          <span className="skeleton" style={{ height: 16, width: '60%' }} />
          <span className="skeleton" style={{ height: 12, width: '40%' }} />
        </div>
      </div>
      <div className="skeleton-card__body">
        <span className="skeleton" style={{ height: 12 }} />
        <span className="skeleton" style={{ height: 12 }} />
        <span className="skeleton" style={{ height: 12, width: '80%' }} />
      </div>
    </div>
  )

  return (
    <ScreenState
      title={title}
      description={description}
      icon={icon}
      tone="neutral"
      className={classes}
      role="status"
      {...rest}
    >
      <div aria-busy className="skeleton-group">
        {skeleton ?? fallbackSkeleton}
      </div>
    </ScreenState>
  )
}

export default LoadingState
