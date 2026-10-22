import { Link } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import { libraryStats } from '../lib/library'

export default function StatsPage() {
  const { items, ready } = useLibrary()
  const stats = libraryStats(items)
  return <>
    <header className="top"><div><p className="eyebrow">Każdy seans się liczy</p><h1>Statystyki</h1></div></header>
    {!ready ? <p role="status">Liczymy Twoje seanse…</p> : <>
      <div className="stats-grid">{[[stats.movies, 'Obejrzane filmy'], [stats.series, 'Ukończone seriale'], [stats.episodes, 'Obejrzane odcinki'], [`${Math.floor(stats.minutes / 60)} h ${stats.minutes % 60} min`, 'Szacowany czas oglądania']].map(([value, label]) => <div className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <p className="hint">Czas obejmuje zapisane długości filmów i średnią długość odcinka z TMDB. Serial oznaczony jako obejrzany liczymy w całości. Odcinki specjalne mogą nie być uwzględnione w sumie serialu.</p>
      {stats.missingRuntime > 0 && <p className="hint">Dla {stats.missingRuntime} oglądanych tytułów brakuje długości — czas nie obejmuje tych pozycji.</p>}
      <section className="feature-panel"><h2>Twoje ulubione gatunki</h2><p className="meta">Na podstawie obejrzanych tytułów i rozpoczętych seriali.</p>{stats.genres.length ? <ol className="genre-bars">{stats.genres.slice(0, 8).map(([name, count]) => <li key={name}><div><span>{name}</span><strong>{count}</strong></div><meter min="0" max={stats.genres[0][1]} value={count} aria-label={name} /></li>)}</ol> : <p className="empty">Obejrzyj pierwszy tytuł z zapisanymi gatunkami, aby zobaczyć zestawienie.</p>}</section>
      <Link className="text-link" to="/library">Przejdź do biblioteki i uzupełnij dane →</Link>
    </>}
  </>
}
