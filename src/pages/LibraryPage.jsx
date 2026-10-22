import { getToken } from '../api'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import { PosterCard } from '../components/Poster'
import { filterLibrary, titleMetadata } from '../lib/library'
import { details, hasTmdbCredentials } from '../tmdb'

const defaults = { query: '', type: '', status: '', genre: '', year: '', sort: 'recent' }
export default function LibraryPage() {
  const { items, collections, ready, save } = useLibrary()
  const [params, setParams] = useSearchParams()
  const collectionId = params.get('collection') || ''
  const collection = collections.find((c) => c.id === collectionId)
  const [filters, setFilters] = useState(defaults)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const update = (name) => (e) => setFilters((prev) => ({ ...prev, [name]: e.target.value }))
  const pool = collectionId ? items.filter((i) => collection?.items.some((x) => x.mediaType === i.mediaType && x.tmdbId === i.tmdbId)) : items
  const shown = filterLibrary(pool, filters)
  const genres = [...new Set(items.flatMap((i) => i.genres || []))].sort((a,b) => a.localeCompare(b, 'pl'))
  const years = [...new Set(items.map((i) => i.year).filter(Boolean))].sort().reverse()
  const missing = items.filter((i) => !i.metadataVersion)
  const enrich = async () => {
    const session = getToken()
    setBusy(true); setMessage('Uzupełniam dane…')
    let done = 0
    for (let offset = 0; offset < missing.length; offset += 3) {
      if (getToken() !== session) break
      await Promise.all(missing.slice(offset, offset + 3).map(async (item) => {
        try { const info = await details(item.mediaType, item.tmdbId); if (getToken() === session && await save({ ...item, ...titleMetadata(info, item.mediaType) })) done++ } catch { /* Report the exact completed count below. */ }
      }))
    }
    setMessage(`Uzupełniono ${done} z ${missing.length} tytułów.${done < missing.length ? ' Pozostałe możesz ponowić.' : ''}`)
    setBusy(false)
  }
  return <>
    <header className="top"><div><p className="eyebrow">Twoje historie</p><h1>Biblioteka <span className="count">{items.length}</span></h1></div><Link className="btn small" to="/collections">Kolekcje</Link></header>
    {missing.length > 0 && <div className="feature-panel"><p>Uzupełnij dane starszych wpisów, aby korzystać z filtrów gatunku, czasu oglądania i postępu seriali.</p><button className="btn small" disabled={busy || !hasTmdbCredentials} onClick={enrich}>Uzupełnij dane ({missing.length})</button>{!hasTmdbCredentials && <p className="hint">Potrzebny jest dostęp do TMDB.</p>}</div>}
    {message && <p role="status">{message}</p>}
    <div className="quick-links"><Link className="text-link" to="/watched">Zobacz obejrzane →</Link></div>
    <div className="filters">
      <label>Tytuł<input type="search" value={filters.query} onChange={update('query')} placeholder="Szukaj w bibliotece" /></label>
      <label>Rodzaj<select aria-label="Rodzaj" value={filters.type} onChange={update('type')}><option value="">Filmy i seriale</option><option value="movie">Filmy</option><option value="tv">Seriale</option></select></label>
      <label>Status<select aria-label="Status" value={filters.status} onChange={update('status')}><option value="">Wszystkie statusy</option><option value="watchlist">Do obejrzenia</option><option value="watching">Oglądam</option><option value="watched">Obejrzane</option></select></label>
      <label>Gatunek<select aria-label="Gatunek" value={filters.genre} onChange={update('genre')}><option value="">Wszystkie gatunki</option>{genres.map((g) => <option key={g}>{g}</option>)}</select></label>
      <label>Rok<select aria-label="Rok" value={filters.year} onChange={update('year')}><option value="">Wszystkie lata</option>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
      <label>Kolekcja<select aria-label="Kolekcja" value={collectionId} onChange={(e) => setParams(e.target.value ? { collection: e.target.value } : {})}><option value="">Wszystkie kolekcje</option>{collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Sortowanie<select aria-label="Sortowanie" value={filters.sort} onChange={update('sort')}><option value="recent">Ostatnio dodane</option><option value="rating">Ocena TMDB</option><option value="year">Najnowszy rok</option><option value="title">Tytuł A–Z</option></select></label>
      <button className="btn small" onClick={() => { setFilters(defaults); setParams({}) }}>Wyczyść filtry</button>
    </div>
    {!ready ? <p role="status">Ładowanie biblioteki…</p> : <><p className="meta" role="status">{shown.length} z {pool.length} tytułów{collection ? ` · ${collection.name}` : ''}</p>{shown.length ? <div className="grid">{shown.map((i) => <PosterCard key={`${i.mediaType}-${i.tmdbId}`} item={i} />)}</div> : <div className="empty-panel"><h2>{items.length ? 'Brak pasujących tytułów' : 'Twoja biblioteka czeka na pierwszy seans'}</h2><p>{items.length ? 'Zmień filtry lub dodaj tytuł do wybranej kolekcji na jego stronie.' : 'Znajdź film lub serial i dodaj go do listy.'}</p><Link className="text-link" to="/search">Szukaj filmów i seriali →</Link></div>}</>}
  </>
}
