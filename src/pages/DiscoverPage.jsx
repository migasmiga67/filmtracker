import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { discover } from '../tmdb'
import { useLibrary } from '../context/LibraryContext'
import { useAddTitle } from '../lib/useAddTitle'
import Select from '../components/Select'
import { Poster } from '../components/Poster'

export default function DiscoverPage() {
  const { items, find } = useLibrary()
  const { add, adding } = useAddTitle()
  const [type, setType] = useState('movie')
  const [category, setCategory] = useState('popular')
  const [seedKey, setSeedKey] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const preferred = [...items].sort((a,b) => Number(b.status === 'watched') - Number(a.status === 'watched') || (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  const seed = items.find((i) => `${i.mediaType}-${i.tmdbId}` === seedKey) || preferred[0]
  const seedType = seed?.mediaType, seedId = seed?.tmdbId
  useEffect(() => {
    let cancelled = false
    setData(null); setError('')
    if (category === 'similar' && !seedId) return
    discover(type, category, page, seedId ? { mediaType: seedType, tmdbId: seedId } : null)
      .then((value) => { if (!cancelled) setData(value) })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [type, category, page, attempt, seedType, seedId])
  return <>
    <header className="top"><div><p className="eyebrow">Nowy seans zaczyna się tutaj</p><h1>Odkrywaj</h1></div></header>
    <div className="segmented" role="group" aria-label="Kategorie odkrywania">{[['popular','Popularne'],['premieres','Premiery'],['similar','Podobne do…']].map(([key,label]) => <button key={key} className={category === key ? 'active' : ''} aria-pressed={category === key} onClick={() => { setCategory(key); setPage(1) }}>{label}</button>)}</div>
    <div className="filters">{category !== 'similar' ? <label>Rodzaj<Select label="Rodzaj" value={type} onChange={(value) => { setType(value); setPage(1) }} options={[{value:'movie',label:'Filmy'},{value:'tv',label:'Seriale'}]} /></label> : <label>Tytuł z Twojej biblioteki<Select label="Tytuł z Twojej biblioteki" value={seed ? `${seed.mediaType}-${seed.tmdbId}` : ''} onChange={(value) => { setSeedKey(value); setPage(1) }} options={preferred.length ? preferred.map((i) => ({value:`${i.mediaType}-${i.tmdbId}`,label:i.title})) : [{value:'',label:'Brak zapisanych tytułów'}]} /></label>}</div>
    <p className="meta">{category === 'similar' ? `Propozycje TMDB${seed ? ` podobne do „${seed.title}”` : ''}.` : category === 'premieres' ? type === 'movie' ? 'Filmy aktualnie w kinach według TMDB dla Polski.' : 'Seriale aktualnie emitowane według TMDB.' : 'Popularne tytuły według TMDB.'}</p>
    {category === 'similar' && !seed ? <div className="empty-panel"><h2>Od czego zacząć?</h2><p>Dodaj tytuł do biblioteki, a znajdziemy podobne propozycje.</p><Link className="text-link" to="/search">Znajdź pierwszy tytuł →</Link></div> : error ? <div className="empty-panel"><p className="error" role="alert">{error}</p><button className="btn" onClick={() => setAttempt((n) => n + 1)}>Spróbuj ponownie</button></div> : !data ? <p role="status" className="state">Szukamy inspiracji…</p> : <>
      {!data.items.length ? <p className="empty">Brak propozycji w tej kategorii. Wybierz inny tytuł lub kategorię.</p> : <div className="catalog-grid">{data.items.map((i) => { const key = `${i.mediaType}-${i.tmdbId}`; return <article className="catalog-card" key={key}><Link to={`/title/${i.mediaType}/${i.tmdbId}`}><Poster item={i} /><h2>{i.title}</h2><p className="meta">{i.year || 'Brak roku'}{i.tmdbRating > 0 ? ` · ★ ${i.tmdbRating.toFixed(1)}` : ''}</p></Link>{find(i.mediaType,i.tmdbId) ? <span className="chip">W bibliotece</span> : <button className="btn small" disabled={adding.has(key)} aria-label={`Dodaj „${i.title}” do listy`} onClick={() => add(i)}>{adding.has(key) ? 'Dodaję…' : '+ Do obejrzenia'}</button>}</article> })}</div>}
      <div className="pagination"><button className="btn small" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>← Poprzednia</button><span aria-live="polite">Strona {page} z {data.pages}</span><button className="btn small" disabled={page >= data.pages} onClick={() => setPage((n) => n + 1)}>Następna →</button></div>
    </>}
  </>
}
