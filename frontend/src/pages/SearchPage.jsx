import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { search } from '../tmdb'
import { useLibrary } from '../context/LibraryContext'
import { Poster } from '../components/Poster'

export default function SearchPage() {
  const { find, save } = useLibrary()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [state, setState] = useState('idle') // idle | loading | done | error

  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setResults([])
      setState('idle')
      return
    }
    setState('loading')
    let cancelled = false
    const t = setTimeout(() => {
      search(query)
        .then((r) => !cancelled && (setResults(r), setState('done')))
        .catch(() => !cancelled && setState('error'))
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

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
      <header className="top"><h1>Szukaj</h1></header>
      <input
        className="search"
        type="search"
        placeholder="Tytuł filmu lub serialu"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />

      {state === 'loading' && <p className="state">Szukam…</p>}
      {state === 'error' && <p className="error">Nie udało się wyszukać. Spróbuj ponownie.</p>}
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
                <button className="btn small" onClick={() => addToWatchlist(r)}>Dodaj</button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
