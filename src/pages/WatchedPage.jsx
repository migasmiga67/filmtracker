import { Link } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import { PosterCard } from '../components/Poster'

export default function WatchedPage() {
  const { items, ready } = useLibrary()
  const watched = items
    .filter((i) => i.status === 'watched')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

  return (
    <>
      <header className="top"><div><p className="eyebrow">Twoje filmowe wspomnienia</p><h1>Obejrzane <span className="count">{watched.length}</span></h1></div></header>
      {!ready ? (
        <p className="state">Ładowanie…</p>
      ) : watched.length === 0 ? (
        <div className="empty-panel"><h2>Każdy seans ma tu swoje miejsce</h2><p>Oznacz film lub serial jako obejrzany na jego stronie. Znajdziesz go później właśnie tutaj.</p><Link className="btn primary" to="/search">Znajdź pierwszy tytuł</Link></div>
      ) : (
        <div className="grid">
          {watched.map((i) => (
            <PosterCard key={`${i.mediaType}-${i.tmdbId}`} item={i} />
          ))}
        </div>
      )}
    </>
  )
}
