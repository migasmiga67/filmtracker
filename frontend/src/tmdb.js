const BASE = 'https://api.themoviedb.org/3'
const TOKEN = import.meta.env.VITE_TMDB_TOKEN
const KEY = import.meta.env.VITE_TMDB_KEY
const LANG = 'pl-PL'

async function get(path, params = {}) {
  const url = new URL(BASE + path)
  url.searchParams.set('language', LANG)
  if (!TOKEN && KEY) url.searchParams.set('api_key', KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  })
  if (!res.ok) throw new Error('Nie udało się pobrać danych z TMDB')
  return res.json()
}

export const img = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

// Ujednolicony kształt: { tmdbId, mediaType, title, posterPath, year }
export function normalize(r, mediaType = r.media_type) {
  const date = r.release_date || r.first_air_date || ''
  return {
    tmdbId: r.id,
    mediaType,
    title: r.title || r.name,
    posterPath: r.poster_path,
    year: date.slice(0, 4),
  }
}

export async function search(query) {
  const data = await get('/search/multi', { query, include_adult: false })
  return data.results
    .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r) => normalize(r))
}

export const details = (type, id) => get(`/${type}/${id}`)
export const season = (id, n) => get(`/tv/${id}/season/${n}`)
