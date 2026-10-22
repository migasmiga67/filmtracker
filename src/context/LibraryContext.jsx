import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const LibCtx = createContext(null)
export const useLibrary = () => useContext(LibCtx)

const same = (a, b) => a.mediaType === b.mediaType && a.tmdbId === b.tmdbId

export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [collections, setCollections] = useState([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const mutations = useRef(0)

  const reload = async (version = generation.current) => {
    const revision = mutations.current
    try {
      const [library, groups] = await Promise.allSettled([api.getLibrary(), api.getCollections()])
      if (version === generation.current) {
        if (library.status === 'fulfilled' && revision === mutations.current) setItems(library.value)
        if (groups.status === 'fulfilled') setCollections(groups.value)
        const failure = [library, groups].find((r) => r.status === 'rejected')
        setError(failure ? failure.reason.message : '')
      }
    } catch (e) {
      if (version === generation.current) setError(e.message || 'Nie udało się wczytać biblioteki.')
    } finally {
      if (version === generation.current) setReady(true)
    }
  }

  useEffect(() => {
    const version = ++generation.current
    setItems([])
    setCollections([])
    setReady(false)
    setError('')
    if (user) reload(version)
    return () => { generation.current++ }
  }, [user])

  const find = (type, id) =>
    items.find((i) => i.mediaType === type && i.tmdbId === Number(id))

  // Zapis z natychmiastową aktualizacją widoku; przy błędzie wraca stan z serwera.
  const save = async (item) => {
    mutations.current++
    const version = generation.current
    setError('')
    const next = { ...item, createdAt: item.createdAt || items.find((i) => same(i, item))?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
    setItems((prev) => [...prev.filter((i) => !same(i, next)), next])
    try {
      const stored = await api.saveItem(next)
      if (version === generation.current) setItems((prev) => prev.map((i) => same(i, stored) && i.updatedAt === next.updatedAt ? stored : i))
      return true
    } catch (e) {
      await reload(version)
      if (version === generation.current) setError(e.message || 'Nie udało się zapisać zmian.')
      return false
    }
  }

  const remove = async (type, id) => {
    mutations.current++
    const version = generation.current
    setError('')
    setItems((prev) => prev.filter((i) => !(i.mediaType === type && i.tmdbId === Number(id))))
    try {
      await api.removeItem(type, id)
      if (version === generation.current) setCollections((prev) => prev.map((c) => ({ ...c, items: c.items.filter((i) => !(i.mediaType === type && i.tmdbId === Number(id))) })))
    } catch (e) {
      await reload(version)
      if (version === generation.current) setError(e.message || 'Nie udało się zapisać zmian.')
      return false
    }
  }

  const changeCollection = async (operation) => {
    const version = generation.current
    setError('')
    try {
      await operation()
      if (version !== generation.current) return false
      const data = await api.getCollections()
      if (version === generation.current) setCollections(data)
      return true
    } catch (e) {
      if (version === generation.current) setError(e.message)
      return false
    }
  }

  return (
    <LibCtx.Provider value={{ items, collections, changeCollection, ready, error, clearError: () => setError(''), reload, find, save, remove }}>{children}</LibCtx.Provider>
  )
}
