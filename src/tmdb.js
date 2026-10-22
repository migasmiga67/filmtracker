const BASE = 'https://api.themoviedb.org/3'
const TOKEN = (import.meta.env.VITE_TMBD_TOKEN || import.meta.env.TMBD_TOKEN || import.meta.env.VITE_TMDB_TOKEN || import.meta.env.TMB_TOKEN || '').trim()
const KEY = (import.meta.env.VITE_TMBD_KEY || import.meta.env.TMBD_KEY || import.meta.env.VITE_TMDB_KEY || import.meta.env.TMB_KEY || '').trim()
const LANG = 'pl-PL'
export const hasTmdbCredentials = Boolean(TOKEN || KEY)

async function get(path, params = {}) {
  if (!hasTmdbCredentials) throw new Error('Wyszukiwanie wymaga skonfigurowania dostępu do TMDB. Twoja biblioteka nadal jest dostępna.')
  const url = new URL(BASE + path)
  url.searchParams.set('language', LANG)
  if (!TOKEN && KEY) url.searchParams.set('api_key', KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
  })
  if (!res.ok) throw new Error(res.status === 401 ? 'Dostęp do TMDB wygasł lub jest nieprawidłowy.' : 'Nie udało się pobrać danych z TMDB. Spróbuj ponownie.')
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
    tmdbRating: Number(r.vote_average) || 0,
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

export async function discover(type, category, page = 1, seed = null) {
  const path = category === 'similar' && seed ? `/${seed.mediaType}/${seed.tmdbId}/recommendations`
    : `/${type}/${category === 'premieres' ? (type === 'movie' ? 'now_playing' : 'on_the_air') : 'popular'}`
  const data = await get(path, { region: 'PL', page })
  return { items: (data.results || []).map((r) => normalize(r, category === 'similar' && seed ? seed.mediaType : type)), pages: Math.min(data.total_pages || 1, 500) }
}
export const watchProviders = (type, id) => get(`/${type}/${id}/watch/providers`)
