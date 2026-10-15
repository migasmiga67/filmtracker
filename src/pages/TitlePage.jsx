import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { details, img, season as fetchSeason } from '../tmdb'
import { api } from '../api'
import { useLibrary } from '../context/LibraryContext'
import Stars from '../components/Stars'

const STATUSES = {
  watchlist: 'Do obejrzenia',
  watching: 'Oglądam',
  watched: 'Obejrzane',
}

export default function TitlePage() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const { find, save, remove } = useLibrary()
  const item = find(type, id)

  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setInfo(null)
    setError('')
    details(type, id).then(setInfo).catch((e) => setError(e.message))
  }, [type, id])

  if (error) return <p className="error">{error}</p>
  if (!info) return <p className="state">Ładowanie…</p>

  const title = info.title || info.name
  const base = { tmdbId: info.id, mediaType: type, title, posterPath: info.poster_path }
  const year = (info.release_date || info.first_air_date || '').slice(0, 4)
  const meta = [
    type === 'tv' ? 'Serial' : 'Film',
    year,
    type === 'movie' && info.runtime ? `${info.runtime} min` : null,
    type === 'tv' && info.number_of_seasons ? `${info.number_of_seasons} sez.` : null,
  ].filter(Boolean)

  const available = type === 'movie' ? ['watchlist', 'watched'] : Object.keys(STATUSES)
  const setStatus = (status) => save({ ...base, episodes: item?.episodes || [], ...item, status })

  const backdrop = img(info.backdrop_path, 'w780')

  return (
    <article className="title">
      <button className="btn ghost back" onClick={() => navigate(-1)}>← Wstecz</button>

      <div className="hero" style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}>
        <div className="hero-fade" />
      </div>

      <div className="title-head">
        {info.poster_path && <img className="poster title-poster" src={img(info.poster_path)} alt="" />}
        <div>
          <h1>{title}</h1>
          <p className="meta">{meta.join(', ')}</p>
          {info.genres?.length > 0 && <p className="meta">{info.genres.map((g) => g.name).join(', ')}</p>}
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Status">
        {available.map((s) => (
          <button key={s} className={item?.status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {STATUSES[s]}
          </button>
        ))}
      </div>
      {item && (
        <button className="btn link" onClick={() => remove(type, id)}>Usuń z mojej listy</button>
      )}

      {info.overview && <p className="overview">{info.overview}</p>}

      {type === 'tv' && (
        <Episodes info={info} item={item} base={base} save={save} />
      )}

      <Reviews type={type} id={id} />
    </article>
  )
}

function Episodes({ info, item, base, save }) {
  const seasons = (info.seasons || []).filter((s) => s.season_number > 0)
  const [num, setNum] = useState(seasons[0]?.season_number)
  const [eps, setEps] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (num == null) return
    setLoading(true)
    fetchSeason(info.id, num)
      .then((s) => setEps(s.episodes || []))
      .catch(() => setEps([]))
      .finally(() => setLoading(false))
  }, [info.id, num])

  if (!seasons.length) return null

  const watched = new Set(item?.episodes || [])
  const key = (e) => `${num}x${e.episode_number}`
  const update = (next) =>
    save({ ...base, ...item, episodes: next, status: item?.status === 'watched' ? 'watched' : 'watching' })

  const toggle = (e) => {
    const next = new Set(watched)
    next.has(key(e)) ? next.delete(key(e)) : next.add(key(e))
    update([...next])
  }
  const allDone = eps.length > 0 && eps.every((e) => watched.has(key(e)))
  const toggleSeason = () => {
    const next = new Set(watched)
    eps.forEach((e) => (allDone ? next.delete(key(e)) : next.add(key(e))))
    update([...next])
  }

  return (
    <section className="episodes">
      <h2>Odcinki</h2>
      <div className="season-tabs" role="tablist">
        {seasons.map((s) => (
          <button
            key={s.season_number}
            role="tab"
            aria-selected={s.season_number === num}
            className={s.season_number === num ? 'active' : ''}
            onClick={() => setNum(s.season_number)}
          >
            {s.season_number}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="state">Ładowanie odcinków…</p>
      ) : (
        <>
          <button className="btn small" onClick={toggleSeason}>
            {allDone ? 'Odznacz cały sezon' : 'Zaznacz cały sezon'}
          </button>
          <ul className="ep-list">
            {eps.map((e) => (
              <li key={e.id}>
                <label>
                  <input type="checkbox" checked={watched.has(key(e))} onChange={() => toggle(e)} />
                  <span className="ep-num">{e.episode_number}</span>
                  <span className="ep-name">
                    {e.name}
                    {e.runtime ? <small>{e.runtime} min</small> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Reviews({ type, id }) {
  const [data, setData] = useState(null)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    api.getReviews(type, id).then((d) => {
      setData(d)
      setRating(d.mine?.rating || 0)
      setText(d.mine?.text || '')
    })

  useEffect(() => {
    setData(null)
    load().catch((e) => setMsg(e.message))
  }, [type, id])

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) {
      setMsg('Wybierz ocenę od 1 do 5 gwiazdek')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await api.saveReview(type, id, { rating, text: text.trim() })
      await load()
      setMsg('Zapisano')
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="reviews">
      <h2>Opinie użytkowników Klaps</h2>

      {data && (
        <div className="avg">
          {data.count > 0 ? (
            <>
              <strong>{data.average.toFixed(1)}</strong>
              <Stars value={data.average} size={18} />
              <span>({data.count})</span>
            </>
          ) : (
            <span className="empty">Nikt jeszcze nie ocenił. Zrób to pierwszy.</span>
          )}
        </div>
      )}

      <form onSubmit={submit} className="review-form">
        <p>Twoja ocena</p>
        <Stars value={rating} onChange={setRating} />
        <textarea
          rows="3"
          maxLength={1000}
          placeholder="Napisz kilka słów (opcjonalnie)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn primary" disabled={busy}>
          {data?.mine ? 'Zapisz zmiany' : 'Dodaj opinię'}
        </button>
        {msg && <p className={msg === 'Zapisano' ? 'ok' : 'error'} role="status">{msg}</p>}
      </form>

      {data?.reviews.length > 0 && (
        <ul className="review-list">
          {data.reviews.map((r, i) => (
            <li key={i}>
              <div className="review-top">
                <strong>{r.userName}</strong>
                <Stars value={r.rating} size={14} />
              </div>
              <p>{r.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
