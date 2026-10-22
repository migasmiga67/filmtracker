import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useLibrary } from '../context/LibraryContext'

export default function CollectionsPage() {
  const { collections, ready, changeCollection } = useLibrary()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState('')
  const [draft, setDraft] = useState('')
  const [deleting, setDeleting] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (operation, after = () => {}) => { setBusy(true); try { if (await changeCollection(operation)) after() } finally { setBusy(false) } }
  return <>
    <header className="top"><div><p className="eyebrow">Porządek po Twojemu</p><h1>Kolekcje</h1></div><Link className="text-link" to="/library">Biblioteka →</Link></header>
    <p className="meta">Na wieczór, na weekend, do obejrzenia razem. Dodawaj tytuły do kolekcji na ich stronach.</p>
    <form className="inline-form feature-panel" onSubmit={(e) => { e.preventDefault(); run(() => api.createCollection(name), () => setName('')) }}><label>Nazwa nowej kolekcji<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Np. Wieczór z przyjaciółmi" /></label><button className="btn primary" disabled={busy || !name.trim()}>Utwórz kolekcję</button></form>
    {!ready ? <p role="status">Ładowanie kolekcji…</p> : !collections.length ? <div className="empty-panel"><h2>Pierwsza kolekcja?</h2><p>Nadaj jej nazwę powyżej. Usunięcie kolekcji nigdy nie usuwa tytułów z biblioteki.</p></div> : <ul className="collection-list">{collections.map((c) => <li className="feature-panel" key={c.id}>
      {editing === c.id ? <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => api.renameCollection(c.id, draft), () => setEditing('')) }}><label>Nowa nazwa<input required maxLength={80} value={draft} onChange={(e) => setDraft(e.target.value)} /></label><button className="btn small" disabled={busy || !draft.trim()}>Zapisz nazwę</button><button className="btn ghost" type="button" disabled={busy} onClick={() => setEditing('')}>Anuluj</button></form> : <><div><Link className="collection-name" to={`/library?collection=${c.id}`}>{c.name}</Link><p className="meta">Tytuły: {c.items.length}</p></div><div className="actions"><Link className="btn small" to={`/library?collection=${c.id}`}>Otwórz</Link><button className="btn small" disabled={busy} onClick={() => { setEditing(c.id); setDraft(c.name); setDeleting('') }}>Zmień nazwę</button><button className="btn ghost" disabled={busy} onClick={() => setDeleting(c.id)}>Usuń</button></div></>}
      {deleting === c.id && <div className="confirm-panel"><p>Usunąć kolekcję „{c.name}”? Tytuły zostaną w bibliotece.</p><button className="btn small" disabled={busy} onClick={() => run(() => api.deleteCollection(c.id), () => setDeleting(''))}>Tak, usuń kolekcję</button> <button className="btn ghost" disabled={busy} onClick={() => setDeleting('')}>Anuluj</button></div>}
    </li>)}</ul>}
  </>
}
