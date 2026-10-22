import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const LibCtx = createContext(null)
export const useLibrary = () => useContext(LibCtx)

const same = (a, b) => a.mediaType === b.mediaType && a.tmdbId === b.tmdbId

export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)

  const reload = async (version = generation.current) => {
    try {
      const data = await api.getLibrary()
      if (version === generation.current) { setItems(data); setError('') }
    } catch (e) {
      if (version === generation.current) setError(e.message || 'Nie udało się wczytać biblioteki.')
    } finally {
      if (version === generation.current) setReady(true)
    }
  }

  useEffect(() => {
    const version = ++generation.current
    setItems([])
    setReady(false)
    setError('')
    if (user) reload(version)
    return () => { generation.current++ }
  }, [user])

  const find = (type, id) =>
    items.find((i) => i.mediaType === type && i.tmdbId === Number(id))

  // Zapis z natychmiastową aktualizacją widoku; przy błędzie wraca stan z serwera.
  const save = async (item) => {
    const version = generation.current
    setError('')
    const next = { ...item, updatedAt: new Date().toISOString() }
    setItems((prev) => [...prev.filter((i) => !same(i, next)), next])
    try {
      await api.saveItem(next)
    } catch (e) {
      await reload(version)
      if (version === generation.current) setError(e.message || 'Nie udało się zapisać zmian.')
    }
  }

  const remove = async (type, id) => {
    const version = generation.current
    setError('')
    setItems((prev) => prev.filter((i) => !(i.mediaType === type && i.tmdbId === Number(id))))
    try {
      await api.removeItem(type, id)
    } catch (e) {
      await reload(version)
      if (version === generation.current) setError(e.message || 'Nie udało się zapisać zmian.')
    }
  }

  return (
    <LibCtx.Provider value={{ items, ready, error, clearError: () => setError(''), reload, find, save, remove }}>{children}</LibCtx.Provider>
  )
}
