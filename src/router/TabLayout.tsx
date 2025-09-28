import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './tabLayout.css'

const tabs = [
  { path: 'profile', label: 'Profil', icon: '👤' },
  { path: 'discovery', label: 'Découvrir', icon: '🔍' },
  { path: 'events', label: 'Événements', icon: '📅' },
  { path: 'messaging', label: 'Messages', icon: '💬' },
]

const TabLayout: React.FC = () => {
  const { logout } = useAuth()
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Meetinity</h1>
        <button type="button" className="secondary" onClick={logout}>
          Déconnexion
        </button>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
      <nav className="app-shell__tabs" aria-label="Navigation principale">
        {tabs.map((tab) => (
          <NavLink key={tab.path} to={tab.path} className={({ isActive }) => `app-shell__tab ${isActive ? 'app-shell__tab--active' : ''}`} end>
            <span role="img" aria-hidden="true">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default TabLayout
