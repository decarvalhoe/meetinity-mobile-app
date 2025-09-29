import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import useResponsiveBreakpoint from '../../../hooks/useResponsiveBreakpoint'
import '../../shared.css'

const EventsScreen: React.FC = () => {
  const { up } = useResponsiveBreakpoint()
  const isLarge = up('lg')

  return (
    <div className={`events-layout${isLarge ? ' events-layout--split' : ''}`}>
      <nav
        className={`tabs${isLarge ? ' tabs--vertical' : ''}`}
        aria-label="Navigation des événements"
        aria-orientation={isLarge ? 'vertical' : 'horizontal'}
      >
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
