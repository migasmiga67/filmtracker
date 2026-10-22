import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import { api } from '../api'

export default function TitleCollections({ item }) {
  const { collections, changeCollection } = useLibrary()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null)
  const toggle = async (id, checked) => {
    setBusy(true)
    setPending({ id, checked })
    try { await changeCollection(() => api.setCollectionItem(id, item.mediaType, item.tmdbId, checked)) } finally { setBusy(false); setPending(null) }
  }
  return <section className="feature-panel"><h2>Moje kolekcje</h2>{!item ? <p className="meta">Najpierw dodaj tytuł do biblioteki, wybierając status powyżej.</p> : collections.length ? <div className="collection-checks">{collections.map((c) => <label key={c.id}><input type="checkbox" disabled={busy} checked={pending?.id === c.id ? pending.checked : c.items.some((i) => i.mediaType === item.mediaType && i.tmdbId === item.tmdbId)} onChange={(e) => toggle(c.id,e.target.checked)} />{c.name}</label>)}</div> : <p className="meta">Stwórz kolekcję, aby porządkować ulubione tytuły.</p>}<Link className="text-link" to="/collections">Zarządzaj kolekcjami →</Link></section>
}
