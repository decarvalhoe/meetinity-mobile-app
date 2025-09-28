import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import '../../shared.css'

const EventsScreen: React.FC = () => {
  return (
    <div className="events-layout">
      <nav className="tabs" aria-label="Navigation des événements">
        <NavLink to="" end className={({ isActive }) => (isActive ? 'tabs__link tabs__link--active' : 'tabs__link')}>
          Tous les événements
        </NavLink>
        <NavLink
          to="mine"
          className={({ isActive }) => (isActive ? 'tabs__link tabs__link--active' : 'tabs__link')}
        >
          Mes événements
        </NavLink>
      </nav>
      <div className="events-layout__content">
        <Outlet />
      </div>
    </div>
  )
}

export default EventsScreen
