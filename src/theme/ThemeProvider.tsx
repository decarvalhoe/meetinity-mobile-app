import React, { createContext, useContext, useMemo } from 'react'
import type { CSSProperties, PropsWithChildren } from 'react'
import { theme, type Theme } from '../theme'

type ThemeProviderProps = PropsWithChildren<{
  value?: Theme
  className?: string
  style?: CSSProperties
}>

const ThemeContext = createContext<Theme>(theme)

const createCssVariables = (value: Theme): CSSProperties => ({
  '--font-scale': 1,
  '--font-family-sans': value.typography.fontFamily,
  '--font-size-xs': value.typography.sizes.xs,
  '--font-size-sm': value.typography.sizes.sm,
  '--font-size-md': value.typography.sizes.md,
  '--font-size-lg': value.typography.sizes.lg,
  '--font-size-xl': value.typography.sizes.xl,
  '--font-size-2xl': value.typography.sizes['2xl'],
  '--font-size-3xl': value.typography.sizes['3xl'],
  '--line-height-tight': value.typography.lineHeights.tight,
  '--line-height-snug': value.typography.lineHeights.snug,
  '--line-height-normal': value.typography.lineHeights.normal,
  '--line-height-relaxed': value.typography.lineHeights.relaxed,
  '--font-weight-regular': value.typography.weights.regular,
  '--font-weight-medium': value.typography.weights.medium,
  '--font-weight-semibold': value.typography.weights.semibold,
  '--font-weight-bold': value.typography.weights.bold,
  '--letter-spacing-tight': value.typography.letterSpacings.tight,
  '--letter-spacing-normal': value.typography.letterSpacings.normal,
  '--letter-spacing-wide': value.typography.letterSpacings.wide,
  '--space-none': value.spacing.none,
  '--space-3xs': value.spacing['3xs'],
  '--space-2xs': value.spacing['2xs'],
  '--space-xs': value.spacing.xs,
  '--space-sm': value.spacing.sm,
  '--space-md': value.spacing.md,
  '--space-lg': value.spacing.lg,
  '--space-xl': value.spacing.xl,
  '--space-2xl': value.spacing['2xl'],
  '--radius-sm': value.radii.sm,
  '--radius-md': value.radii.md,
  '--radius-lg': value.radii.lg,
  '--radius-xl': value.radii.xl,
  '--radius-pill': value.radii.pill,
  '--shadow-xs': value.shadows.xs,
  '--shadow-sm': value.shadows.sm,
  '--shadow-md': value.shadows.md,
  '--shadow-lg': value.shadows.lg,
  '--duration-instant': value.motion.durations.instant,
  '--duration-fast': value.motion.durations.fast,
  '--duration-normal': value.motion.durations.normal,
  '--duration-slow': value.motion.durations.slow,
  '--easing-standard': value.motion.easing.standard,
  '--easing-emphasized': value.motion.easing.emphasized,
  '--easing-spring': value.motion.easing.spring,
  '--color-primary': value.colors.primary,
  '--color-primary-strong': value.colors.primaryStrong,
  '--color-accent': value.colors.accent,
  '--color-surface': value.colors.surface,
  '--color-surface-muted': value.colors.surfaceMuted,
  '--color-background': value.colors.background,
  '--color-text': value.colors.text,
  '--color-text-on-primary': value.colors.textOnPrimary,
  '--color-muted': value.colors.muted,
  '--color-border': value.colors.border,
  '--color-info': value.colors.info,
  '--color-success': value.colors.success,
  '--color-warning': value.colors.warning,
  '--color-danger': value.colors.danger,
  '--color-focus': value.colors.focus,
  '--color-disabled': value.colors.disabled,
  '--color-overlay': value.colors.overlay,
  '--state-hover': value.states.hover,
  '--state-active': value.states.active,
  '--state-subtle': value.states.subtle,
  '--states-focus-ring': value.states.focusRing,
  '--z-base': value.zIndices.base,
  '--z-raised': value.zIndices.raised,
  '--z-overlay': value.zIndices.overlay,
  '--z-modal': value.zIndices.modal,
  '--z-toast': value.zIndices.toast,
})

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  value = theme,
  children,
  className,
  style,
}) => {
  const cssVariables = useMemo(() => createCssVariables(value), [value])
  return (
    <ThemeContext.Provider value={value}>
      <div className={className} style={{ ...cssVariables, ...style }}>{children}</div>
    </ThemeContext.Provider>
  )
}

/* eslint-disable-next-line react-refresh/only-export-components */
export const useTheme = (): Theme => useContext(ThemeContext)

/* eslint-disable-next-line react-refresh/only-export-components */
export const toCssVariables = createCssVariables

