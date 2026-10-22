export function titleMetadata(info, mediaType) {
  return {
    year: (info.release_date || info.first_air_date || '').slice(0, 4),
    genres: (info.genres || []).map((g) => g.name),
    tmdbRating: Number(info.vote_average) || 0,
    runtime: mediaType === 'movie' ? Number(info.runtime) || 0 : 0,
    episodeRuntime: mediaType === 'tv' ? Number(info.episode_run_time?.[0] || info.last_episode_to_air?.runtime) || 0 : 0,
    totalEpisodes: mediaType === 'tv' ? Number(info.number_of_episodes) || 0 : 0,
    seasons: mediaType === 'tv' ? (info.seasons || []).filter((s) => s.season_number > 0).map((s) => ({ number: s.season_number, count: s.episode_count || 0 })) : [],
    metadataVersion: 1,
  }
}

export function episodeProgress(item) {
  const watched = new Set(item.episodes || [])
  const total = item.totalEpisodes || 0
  const done = item.status === 'watched' && total ? total : watched.size
  let next = null
  if (item.status !== 'watched') {
    for (const s of [...(item.seasons || [])].sort((a, b) => a.number - b.number)) {
      for (let ep = 1; ep <= s.count; ep++) {
        if (!watched.has(`${s.number}x${ep}`)) { next = `S${s.number}E${ep}`; break }
      }
      if (next) break
    }
  }
  return { done, total, percent: total ? Math.min(100, Math.round(done / total * 100)) : 0, next }
}

export function libraryStats(items) {
  const completed = items.filter((i) => i.status === 'watched')
  const genres = new Map()
  let minutes = 0, missingRuntime = 0, episodes = 0
  for (const item of items) {
    const count = item.mediaType === 'tv' ? episodeProgress(item).done : 0
    episodes += count
    const viewed = item.status === 'watched' || count > 0
    if (!viewed) continue
    const runtime = item.mediaType === 'movie' ? item.runtime : item.episodeRuntime
    if (!runtime) missingRuntime++
    else minutes += runtime * (item.mediaType === 'movie' ? 1 : count)
    for (const genre of item.genres || []) genres.set(genre, (genres.get(genre) || 0) + 1)
  }
  return {
    movies: completed.filter((i) => i.mediaType === 'movie').length,
    series: completed.filter((i) => i.mediaType === 'tv').length,
    episodes, minutes, missingRuntime,
    genres: [...genres.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl')),
  }
}

export function filterLibrary(items, filters) {
  return items.filter((i) =>
    (!filters.query || i.title.toLocaleLowerCase('pl').includes(filters.query.trim().toLocaleLowerCase('pl'))) &&
    (!filters.type || i.mediaType === filters.type) &&
    (!filters.status || i.status === filters.status) &&
    (!filters.genre || i.genres?.includes(filters.genre)) &&
    (!filters.year || i.year === filters.year)
  ).sort((a, b) => {
    if (filters.sort === 'title') return a.title.localeCompare(b.title, 'pl')
    if (filters.sort === 'rating') return (b.tmdbRating || 0) - (a.tmdbRating || 0)
    if (filters.sort === 'year') return (b.year || '').localeCompare(a.year || '')
    return (b.createdAt || b.updatedAt || '').localeCompare(a.createdAt || a.updatedAt || '')
  })
}

export function pickWatchlist(items, previousKey = '', random = Math.random) {
  const all = items.filter((i) => i.status === 'watchlist')
  const candidates = all.length > 1 ? all.filter((i) => `${i.mediaType}-${i.tmdbId}` !== previousKey) : all
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null
}
