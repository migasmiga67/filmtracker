import { useEffect, useState } from 'react'
import { img, watchProviders } from '../tmdb'

export default function WatchProviders({ type, id }) {
  const [state, setState] = useState({ loading: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setState({ loading: true })
    watchProviders(type,id).then((data) => { if (!cancelled) setState({ region: data.results?.PL }) }).catch((e) => { if (!cancelled) setState({ error: e.message }) })
    return () => { cancelled = true }
  }, [type,id,attempt])
  const groups = [['flatrate','W abonamencie'],['free','Bezpłatnie'],['ads','Z reklamami'],['rent','Wypożyczenie'],['buy','Zakup']]
  const available = groups.some(([key]) => state.region?.[key]?.length)
  return <section className="feature-panel providers"><h2>Gdzie obejrzeć w Polsce?</h2>
    {state.loading ? <p role="status">Sprawdzamy platformy…</p> : state.error ? <><p className="error" role="alert">{state.error}</p><button className="btn small" onClick={() => setAttempt((n) => n + 1)}>Ponów sprawdzenie platform</button></> : !available ? <p className="empty">Brak informacji o dostępności tego tytułu w Polsce.</p> : groups.map(([key,label]) => state.region?.[key]?.length ? <div className="provider-group" key={key}><h3>{label}</h3><ul>{state.region[key].map((p) => <li key={p.provider_id}>{p.logo_path && <img src={img(p.logo_path, 'w92')} alt="" loading="lazy" />}<span>{p.provider_name}</span></li>)}</ul></div> : null)}
    {state.region?.link?.startsWith('https://www.themoviedb.org/') && <a className="text-link" href={state.region.link} target="_blank" rel="noopener noreferrer">Sprawdź aktualną ofertę w TMDB ↗</a>}
    <p className="hint">Dane: TMDB / JustWatch. Dostępność może się zmieniać; sprawdź ofertę u dostawcy.</p>
  </section>
}
