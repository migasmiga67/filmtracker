import { useLibrary } from '../context/LibraryContext'
import { PosterCard } from '../components/Poster'

export default function WatchedPage() {
  const { items, ready } = useLibrary()
  const watched = items
    .filter((i) => i.status === 'watched')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

  return (
    <>
      <header className="top"><h1>Obejrzane</h1></header>
      {!ready ? (
        <p className="state">Ładowanie…</p>
      ) : watched.length === 0 ? (
        <p className="empty">Jeszcze nic tu nie ma. Oznacz film lub serial jako obejrzany na jego stronie.</p>
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
