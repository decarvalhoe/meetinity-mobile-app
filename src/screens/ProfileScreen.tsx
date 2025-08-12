import React from 'react'
import { useAuth } from '../auth/AuthContext'

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <div>
      <h1>Profile</h1>
      <p>{user.name}</p>
      <p>{user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

export default ProfileScreen
