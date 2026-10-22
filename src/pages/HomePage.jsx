import { useState } from 'react'
import { pickWatchlist } from '../lib/library'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { PosterCard } from '../components/Poster'


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
  const [pickedKey, setPickedKey] = useState('')
  const picked = items.find((i) => `${i.mediaType}-${i.tmdbId}` === pickedKey && i.status === 'watchlist')
  const draw = () => { const item = pickWatchlist(items, pickedKey); setPickedKey(item ? `${item.mediaType}-${item.tmdbId}` : '') }

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
          <section className="roulette feature-panel"><div><p className="eyebrow">Decyzję zostaw nam</p><h2>Co dziś obejrzeć?</h2><p>Wylosuj tytuł ze swojej listy „Do obejrzenia”.</p><button className="btn primary" disabled={!watchlist.length} onClick={draw}>{picked ? 'Losuj ponownie' : 'Wylosuj seans'}</button>{!watchlist.length && <p className="hint">Najpierw dodaj coś do listy.</p>}</div>{picked && <div className="random-pick" role="status"><PosterCard item={picked} /><Link className="text-link" to={`/title/${picked.mediaType}/${picked.tmdbId}`}>Twój dzisiejszy seans →</Link></div>}</section>
          <div className="quick-links"><Link className="btn" to="/library">Moja biblioteka</Link><Link className="btn" to="/collections">Moje kolekcje</Link><Link className="btn" to="/discover">Odkrywaj filmy</Link></div>
          <Row
            title="Oglądasz teraz"
            items={watching}

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
