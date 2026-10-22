import { Link } from 'react-router-dom'
import Progress from './Progress'
import { img } from '../tmdb'

export function Poster({ item, size = 'w342' }) {
  const src = img(item.posterPath, size)
  return src ? (
    <img className="poster" src={src} alt="" loading="lazy" />
  ) : (
    <div className="poster poster-empty" aria-hidden="true">{item.title?.slice(0, 1)}</div>
  )
}

export function PosterCard({ item, caption }) {
  return (
    <Link className="card" to={`/title/${item.mediaType}/${item.tmdbId}`}>
      <Poster item={item} />
      <span className="card-title">{item.title}</span>
      {caption && <span className="card-caption">{caption}</span>}
      {item.mediaType === 'tv' && item.status && <Progress item={item} />}
      {item.tmdbRating > 0 && <small className="meta">★ {item.tmdbRating.toFixed(1)} TMDB{item.year ? ` · ${item.year}` : ''}</small>}
    </Link>
  )
}
