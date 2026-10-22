import { useRef, useState } from 'react'
import { getToken } from '../api'
import { details } from '../tmdb'
import { titleMetadata } from './library'
import { useLibrary } from '../context/LibraryContext'

export function useAddTitle() {
  const { save } = useLibrary()
  const pending = useRef(new Set())
  const [adding, setAdding] = useState(new Set())
  const add = async (item) => {
    const session = getToken()
    const key = `${item.mediaType}-${item.tmdbId}`
    if (pending.current.has(key)) return
    pending.current.add(key); setAdding(new Set(pending.current))
    try {
      let metadata = {}
      try { metadata = titleMetadata(await details(item.mediaType, item.tmdbId), item.mediaType) } catch { /* Saving the result still works; Library offers metadata refresh. */ }
      if (getToken() !== session) return
      await save({ ...item, ...metadata, status: 'watchlist', episodes: [] })
    } finally {
      pending.current.delete(key); setAdding(new Set(pending.current))
    }
  }
  return { add, adding }
}
