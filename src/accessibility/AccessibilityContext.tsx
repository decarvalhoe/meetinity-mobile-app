import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

interface AccessibilitySettings {
  fontScale: number
  setFontScale: (scale: number) => void
  screenReaderHints: boolean
  setScreenReaderHints: (enabled: boolean) => void
}

const STORAGE_KEY = 'meetinity-accessibility'

const defaultSettings: AccessibilitySettings = {
  fontScale: 1,
  setFontScale: () => {},
  screenReaderHints: false,
  setScreenReaderHints: () => {},
}

const AccessibilityContext = createContext<AccessibilitySettings>(defaultSettings)

const readStoredSettings = (): Pick<AccessibilitySettings, 'fontScale' | 'screenReaderHints'> => {
  if (typeof window === 'undefined') {
    return { fontScale: 1, screenReaderHints: false }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { fontScale: 1, screenReaderHints: false }
    }
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>
    return {
      fontScale: typeof parsed.fontScale === 'number' ? parsed.fontScale : 1,
      screenReaderHints: Boolean(parsed.screenReaderHints),
    }
  } catch (error) {
    console.warn('Unable to parse accessibility settings', error)
    return { fontScale: 1, screenReaderHints: false }
  }
}

export const AccessibilityProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [fontScale, setFontScaleState] = useState<number>(() => readStoredSettings().fontScale)
  const [screenReaderHints, setScreenReaderHintsState] = useState<boolean>(
    () => readStoredSettings().screenReaderHints,
  )

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    document.documentElement.style.setProperty('--font-scale', fontScale.toString())
  }, [fontScale])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    document.body?.setAttribute('data-sr-hints', screenReaderHints ? 'true' : 'false')
  }, [screenReaderHints])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const payload = JSON.stringify({ fontScale, screenReaderHints })
    window.localStorage.setItem(STORAGE_KEY, payload)
  }, [fontScale, screenReaderHints])

  const setFontScale = (scale: number) => {
    const value = Math.min(Math.max(scale, 0.85), 1.4)
    setFontScaleState(Number(value.toFixed(2)))
  }

  const setScreenReaderHints = (enabled: boolean) => {
    setScreenReaderHintsState(Boolean(enabled))
  }

  const value = useMemo<AccessibilitySettings>(
    () => ({ fontScale, setFontScale, screenReaderHints, setScreenReaderHints }),
    [fontScale, screenReaderHints],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

export const useAccessibilitySettings = () => useContext(AccessibilityContext)

export default AccessibilityContext
