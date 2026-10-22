import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { search, hasTmdbCredentials } from '../tmdb'
import { useLibrary } from '../context/LibraryContext'
import { Poster } from '../components/Poster'

export default function SearchPage() {
  const { find, save } = useLibrary()
  const [q, setQ] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])
  const [state, setState] = useState('idle') // idle | loading | done | error

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setResults([])
      setState('idle')
      return
    }
    setResults([])
    setError('')
    setState('loading')
    let cancelled = false
    const t = setTimeout(() => {
      search(query)
        .then((r) => !cancelled && (setResults(r), setState('done')))
        .catch((e) => { if (!cancelled) { setError(e.message); setState('error') } })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, attempt])

  const addToWatchlist = (r) =>
    save({
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
      title: r.title,
      posterPath: r.posterPath,
      status: 'watchlist',
      episodes: [],
    })

  return (
    <>
<header className="top"><div><p className="eyebrow">Odkryj coś dobrego</p><h1>Szukaj</h1></div></header>
      <label className="field-label" htmlFor="title-search">Film lub serial</label>
      <input
        id="title-search"
        className="search"
        type="search"
        placeholder="Tytuł filmu lub serialu"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
      />

      {state === 'idle' && <div className="empty-panel"><h2>Co dziś oglądasz?</h2><p>Wpisz co najmniej 2 znaki, aby znaleźć film lub serial i dodać go do swojej listy.</p>{!hasTmdbCredentials && <p role="status">Katalog filmów jest chwilowo niedostępny — dostęp do TMDB nie został skonfigurowany.</p>}</div>}
      {state === 'loading' && <p className="state" role="status">Szukam…</p>}
      {state === 'error' && <div className="empty-panel"><p className="error" role="alert">{error}</p>{hasTmdbCredentials && <button className="btn" onClick={() => setAttempt((n) => n + 1)}>Spróbuj ponownie</button>}</div>}
      {state === 'done' && results.length === 0 && <p className="empty">Brak wyników dla „{q}”.</p>}

      <ul className="results">
        {results.map((r) => {
          const inLib = find(r.mediaType, r.tmdbId)
          return (
            <li key={`${r.mediaType}-${r.tmdbId}`}>
              <Link to={`/title/${r.mediaType}/${r.tmdbId}`} className="result-main">
                <Poster item={r} size="w185" />
                <div>
                  <strong>{r.title}</strong>
                  <span>{r.mediaType === 'tv' ? 'Serial' : 'Film'}{r.year && `, ${r.year}`}</span>
                </div>
              </Link>
              {inLib ? (
                <span className="chip">{{ watchlist: 'Na liście', watching: 'Oglądam', watched: 'Obejrzane' }[inLib.status]}</span>
              ) : (
                <button className="btn small" aria-label={`Dodaj „${r.title}” do listy`} onClick={() => addToWatchlist(r)}>+ Dodaj</button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
