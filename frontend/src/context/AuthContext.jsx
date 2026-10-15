import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, clearToken } from '../api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) return
    api
      .me()
      .then(setUser)
      .catch(clearToken)
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const r = await api.login(email, password)
    setToken(r.token)
    setUser(r.user)
  }
  const register = async (name, email, password) => {
    const r = await api.register(name, email, password)
    setToken(r.token)
    setUser(r.user)
  }
  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}
