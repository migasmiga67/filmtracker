import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { PosterCard } from '../components/Poster'

const plural = (n) => (n === 1 ? 'odcinek' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'odcinki' : 'odcinków')

function Row({ title, items, caption, empty }) {
  return (
    <section className="row">
      <h2>{title} <span className="count">{items.length}</span></h2>
      {items.length === 0 ? (
        <div className="empty-panel"><p>{empty}</p><Link className="text-link" to="/search">Znajdź coś do obejrzenia →</Link></div>
      ) : (
        <div className="scroller">
          {items.map((i) => (
            <PosterCard key={`${i.mediaType}-${i.tmdbId}`} item={i} caption={caption?.(i)} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const { items, ready } = useLibrary()

  const byRecent = (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')
  const watching = items.filter((i) => i.status === 'watching').sort(byRecent)
  const watchlist = items.filter((i) => i.status === 'watchlist').sort(byRecent)

  return (
    <>
      <header className="top">
        <div>
          <p className="eyebrow">Twój seans, Twoje tempo</p><h1 className="logo">Klaps<span className="brand-dot">.</span></h1>
          <p className="hello">Cześć, {user.name}</p>
        </div>
        <button className="btn ghost" onClick={logout}>Wyloguj</button>
      </header>

      <section className="library-intro"><div><p className="eyebrow">Wszystko w jednym miejscu</p><h2>Jeszcze jeden odcinek?</h2><p>Wróć do ulubionych historii albo zaplanuj kolejny seans.</p></div><Link className="btn primary" to="/search">Znajdź film lub serial →</Link></section>
      {!ready ? (
        <p className="state">Ładowanie…</p>
      ) : (
        <>
          <Row
            title="Oglądasz teraz"
            items={watching}
            caption={(i) => {
              const n = i.episodes?.length || 0
              return n ? `${n} ${plural(n)}` : 'bez odcinków'
            }}
            empty="Nic w trakcie. Zaznacz pierwszy odcinek serialu, a pojawi się tutaj."
          />
          <Row
            title="Do obejrzenia"
            items={watchlist}
            empty="Lista jest pusta."
          />

        </>
      )}
    </>
  )
}
