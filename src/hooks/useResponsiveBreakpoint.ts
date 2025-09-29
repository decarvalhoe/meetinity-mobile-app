import { useEffect, useMemo, useState } from 'react'
import { theme } from '../theme'

export type BreakpointKey = keyof typeof theme.breakpoints

const orderedBreakpoints = (Object.entries(theme.breakpoints) as Array<[
  BreakpointKey,
  number,
]>).sort(([, a], [, b]) => a - b)

const getBreakpointFromWidth = (width: number): BreakpointKey => {
  let current: BreakpointKey = orderedBreakpoints[0][0]
  for (const [name, value] of orderedBreakpoints) {
    if (width >= value) {
      current = name
    }
  }
  return current
}

const getViewportWidth = () => {
  if (typeof window === 'undefined') {
    return theme.breakpoints.md
  }
  return window.innerWidth
}

export interface ResponsiveBreakpointState {
  width: number
  breakpoint: BreakpointKey
  up: (breakpoint: BreakpointKey) => boolean
  down: (breakpoint: BreakpointKey) => boolean
  between: (min: BreakpointKey, max: BreakpointKey) => boolean
}

export const useResponsiveBreakpoint = (): ResponsiveBreakpointState => {
  const [width, setWidth] = useState<number>(() => getViewportWidth())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleResize = () => {
      setWidth(window.innerWidth)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const breakpoint = useMemo(() => getBreakpointFromWidth(width), [width])

  const helpers = useMemo<ResponsiveBreakpointState>(() => {
    const up = (key: BreakpointKey) => width >= theme.breakpoints[key]
    const down = (key: BreakpointKey) => width < theme.breakpoints[key]
    const between = (min: BreakpointKey, max: BreakpointKey) =>
      width >= theme.breakpoints[min] && width < theme.breakpoints[max]

    return { width, breakpoint, up, down, between }
  }, [breakpoint, width])

  return helpers
}

export default useResponsiveBreakpoint
