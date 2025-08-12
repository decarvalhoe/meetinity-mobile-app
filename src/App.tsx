import React, { useState } from 'react'
import Home from './Home'
import Auth from './Auth'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'))

  const handleAuth = (newToken: string) => {
    localStorage.setItem('authToken', newToken)
    setToken(newToken)
  }

  return token ? <Home /> : <Auth onAuth={handleAuth} />
}

export default App
