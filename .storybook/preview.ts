import type { Preview } from '@storybook/react'
import React from 'react'
import '../src/index.css'
import '../src/features/shared.css'
import { AccessibilityProvider } from '../src/accessibility'

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: 'var(--color-surface)' },
        { name: 'fond', value: 'var(--color-background)' },
      ],
    },
    a11y: {
      element: '#storybook-root',
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
  decorators: [
    (Story) => (
      <AccessibilityProvider>
        <div style={{ minHeight: '100vh', padding: '1.5rem', background: 'var(--color-background)' }}>
          <Story />
        </div>
      </AccessibilityProvider>
    ),
  ],
}

export default preview
