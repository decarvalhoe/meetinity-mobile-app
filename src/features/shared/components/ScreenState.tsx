import React from 'react'

export type ScreenStateTone = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export interface ScreenStateProps {
  title?: string
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: ScreenStateTone
  actions?: React.ReactNode
  className?: string
  role?: React.AriaRole
  children?: React.ReactNode
}

const toneToClassName: Record<ScreenStateTone, string> = {
  neutral: 'state',
  info: 'state state--info',
  success: 'state state--success',
  warning: 'state offline-placeholder',
  error: 'state state--error',
}

const ScreenState: React.FC<ScreenStateProps> = ({
  title,
  description,
  icon,
  tone = 'neutral',
  actions,
  className,
  role,
  children,
}) => {
  const classes = [toneToClassName[tone], className].filter(Boolean).join(' ')

  return (
    <div className={classes} role={role} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      {icon && <span className="state__icon" aria-hidden>{icon}</span>}
      {title && <h2 className="state__title">{title}</h2>}
      {description && <p className="state__description">{description}</p>}
      {children}
      {actions && <div className="state__actions">{actions}</div>}
    </div>
  )
}

export default ScreenState
