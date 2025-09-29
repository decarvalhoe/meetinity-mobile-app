import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { useAppStore } from '../store/AppStore'
import useResponsiveBreakpoint from '../hooks/useResponsiveBreakpoint'
import { AccessibilityMenu, useAccessibilitySettings } from '../accessibility'
import './tabLayout.css'

interface TabDefinition {
  path: string
  label: string
  icon: string
  badge?: number | string
}

const baseTabs: Array<Omit<TabDefinition, 'badge'>> = [
  { path: 'profile', label: 'Profil', icon: '👤' },
  { path: 'discovery', label: 'Découvrir', icon: '🔍' },
  { path: 'events', label: 'Événements', icon: '📅' },
  { path: 'messaging', label: 'Messages', icon: '💬' },
]

const TabLayout: React.FC = () => {
  const { logout } = useAuth()
  const { state } = useAppStore()
  const location = useLocation()
  const { up } = useResponsiveBreakpoint()
  const { screenReaderHints } = useAccessibilitySettings()
  const [announcement, setAnnouncement] = useState('')

  const showLabels = up('md')

  const tabs: TabDefinition[] = useMemo(() => {
    const unreadMessages = state.conversations.data.reduce(
      (total, conversation) => total + (conversation.unreadCount ?? 0),
      0,
    )
    const pendingMessages = state.pendingMessages.filter((message) => message.status !== 'failed').length
    const pendingEvents = state.pendingEventRegistrations.filter((registration) => !registration.error).length

    return baseTabs.map((tab) => {
      if (tab.path === 'profile') {
        return { ...tab, badge: state.profile.status === 'error' ? '!' : undefined }
      }
      if (tab.path === 'discovery') {
        return { ...tab, badge: state.matchNotifications.length || undefined }
      }
      if (tab.path === 'events') {
        return { ...tab, badge: pendingEvents || undefined }
      }
      if (tab.path === 'messaging') {
        const totalBadge = unreadMessages + pendingMessages
        return { ...tab, badge: totalBadge || undefined }
      }
      return tab
    })
  }, [
    state.conversations.data,
    state.matchNotifications,
    state.pendingEventRegistrations,
    state.pendingMessages,
    state.profile.status,
  ])

  const activeSegment = location.pathname.split('/')[2] ?? 'profile'
  const activeTab = tabs.find((tab) => activeSegment.startsWith(tab.path)) ?? tabs[0]

  useEffect(() => {
    if (!screenReaderHints || !activeTab) {
      return
    }
    setAnnouncement(`Section ${activeTab.label}`)
  }, [activeTab, screenReaderHints])

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Meetinity</h1>
        <div className="app-shell__header-actions">
          <AccessibilityMenu />
          <button type="button" className="secondary" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
      <nav className="app-shell__tabs" aria-label="Navigation principale" role="tablist">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === 'profile' || tab.path === 'discovery' || tab.path === 'messaging'}
            className="app-shell__tab-link"
            aria-label={
              tab.badge
                ? `${tab.label} (${typeof tab.badge === 'number' ? `${tab.badge} notification(s)` : 'Action requise'})`
                : tab.label
            }
          >
            {({ isActive }) => (
              <span className={`app-shell__tab ${isActive ? 'app-shell__tab--active' : ''}`} role="tab" aria-selected={isActive}>
                <span className="app-shell__tab-icon" aria-hidden>
                  {tab.icon}
                </span>
                {showLabels && <span className="app-shell__tab-label">{tab.label}</span>}
                {tab.badge ? (
                  <motion.span
                    className="app-shell__tab-badge"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                    aria-hidden={typeof tab.badge === 'number'}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </motion.span>
                ) : null}
                {isActive && (
                  <motion.span
                    layoutId="app-shell__tab-indicator"
                    className="app-shell__tab-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  )
}

export default TabLayout
