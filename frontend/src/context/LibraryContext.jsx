import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const LibCtx = createContext(null)
export const useLibrary = () => useContext(LibCtx)

const same = (a, b) => a.mediaType === b.mediaType && a.tmdbId === b.tmdbId

export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  const reload = () =>
    api
      .getLibrary()
      .then(setItems)
      .finally(() => setReady(true))

  useEffect(() => {
    if (!user) {
      setItems([])
      setReady(false)
      return
    }
    reload()
  }, [user])

  const find = (type, id) =>
    items.find((i) => i.mediaType === type && i.tmdbId === Number(id))

  // Zapis z natychmiastową aktualizacją widoku; przy błędzie wraca stan z serwera.
  const save = async (item) => {
    const next = { ...item, updatedAt: new Date().toISOString() }
    setItems((prev) => [...prev.filter((i) => !same(i, next)), next])
    try {
      await api.saveItem(next)
    } catch (e) {
      reload()
      throw e
    }
  }

  const remove = async (type, id) => {
    setItems((prev) => prev.filter((i) => !(i.mediaType === type && i.tmdbId === Number(id))))
    try {
      await api.removeItem(type, id)
    } catch (e) {
      reload()
      throw e
    }
  }

  return (
    <LibCtx.Provider value={{ items, ready, find, save, remove }}>{children}</LibCtx.Provider>
  )
}
