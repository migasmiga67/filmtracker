import { getToken } from '../api'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import Select from '../components/Select'
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
      <label>Rodzaj<Select label="Rodzaj" value={filters.type} onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))} options={[{value:'',label:'Filmy i seriale'},{value:'movie',label:'Filmy'},{value:'tv',label:'Seriale'}]} /></label>
      <label>Status<Select label="Status" value={filters.status} onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))} options={[{value:'',label:'Wszystkie statusy'},{value:'watchlist',label:'Do obejrzenia'},{value:'watching',label:'Oglądam'},{value:'watched',label:'Obejrzane'}]} /></label>
      <label>Gatunek<Select label="Gatunek" value={filters.genre} onChange={(value) => setFilters((prev) => ({ ...prev, genre: value }))} options={[{value:'',label:'Wszystkie gatunki'}, ...genres.map((value) => ({value,label:value}))]} /></label>
      <label>Rok<Select label="Rok" value={filters.year} onChange={(value) => setFilters((prev) => ({ ...prev, year: value }))} options={[{value:'',label:'Wszystkie lata'}, ...years.map((value) => ({value,label:value}))]} /></label>
      <label>Kolekcja<Select label="Kolekcja" value={collectionId} onChange={(value) => setParams(value ? { collection: value } : {})} options={[{value:'',label:'Wszystkie kolekcje'}, ...collections.map((c) => ({value:c.id,label:c.name}))]} /></label>
      <label>Sortowanie<Select label="Sortowanie" value={filters.sort} onChange={(value) => setFilters((prev) => ({ ...prev, sort: value }))} options={[{value:'recent',label:'Ostatnio dodane'},{value:'rating',label:'Ocena TMDB'},{value:'year',label:'Najnowszy rok'},{value:'title',label:'Tytuł A–Z'}]} /></label>
      <button className="btn small" onClick={() => { setFilters(defaults); setParams({}) }}>Wyczyść filtry</button>
    </div>
    {!ready ? <p role="status">Ładowanie biblioteki…</p> : <><p className="meta" role="status">{shown.length} z {pool.length} tytułów{collection ? ` · ${collection.name}` : ''}</p>{shown.length ? <div className="grid">{shown.map((i) => <PosterCard key={`${i.mediaType}-${i.tmdbId}`} item={i} />)}</div> : <div className="empty-panel"><h2>{items.length ? 'Brak pasujących tytułów' : 'Twoja biblioteka czeka na pierwszy seans'}</h2><p>{items.length ? 'Zmień filtry lub dodaj tytuł do wybranej kolekcji na jego stronie.' : 'Znajdź film lub serial i dodaj go do listy.'}</p><Link className="text-link" to="/search">Szukaj filmów i seriali →</Link></div>}</>}
  </>
}
