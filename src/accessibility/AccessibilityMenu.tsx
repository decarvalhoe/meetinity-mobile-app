import React, { useId, useState } from 'react'
import { useAccessibilitySettings } from './AccessibilityContext'

const FONT_SCALE_OPTIONS = [
  { value: 0.95, label: 'Compact' },
  { value: 1, label: 'Standard' },
  { value: 1.2, label: 'Grand' },
]

const AccessibilityMenu: React.FC = () => {
  const { fontScale, setFontScale, screenReaderHints, setScreenReaderHints } = useAccessibilitySettings()
  const [open, setOpen] = useState(false)
  const menuId = useId()

  const handleToggle = () => setOpen((value) => !value)
  const handleClose = () => setOpen(false)

  return (
    <div className="accessibility-menu">
      <button
        type="button"
        className="secondary accessibility-menu__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={handleToggle}
      >
        <span aria-hidden>♿</span>
        <span className="sr-only">Ouvrir les options d’accessibilité</span>
      </button>
      {open && (
        <div className="accessibility-menu__panel" id={menuId} role="dialog" aria-label="Options d’accessibilité">
          <div className="accessibility-menu__section">
            <h2>Affichage</h2>
            <div className="accessibility-menu__options">
              {FONT_SCALE_OPTIONS.map((option) => (
                <label key={option.value} className="accessibility-menu__option">
                  <input
                    type="radio"
                    name="font-scale"
                    value={option.value}
                    checked={Math.abs(fontScale - option.value) < 0.01}
                    onChange={() => setFontScale(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="accessibility-menu__section">
            <h2>Assistance</h2>
            <label className="accessibility-menu__option">
              <input
                type="checkbox"
                checked={screenReaderHints}
                onChange={(event) => setScreenReaderHints(event.target.checked)}
              />
              <span>Activer les aides pour lecteurs d’écran</span>
            </label>
          </div>
          <button type="button" className="secondary" onClick={handleClose}>
            Fermer
          </button>
        </div>
      )}
    </div>
  )
}

export default AccessibilityMenu
