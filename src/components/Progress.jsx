import { episodeProgress } from '../lib/library'

export default function Progress({ item }) {
  const { done, total, percent, next } = episodeProgress(item)
  return <div className="episode-progress">
    <span>{done}{total ? ` / ${total}` : ''} odc. {total > 0 && `· ${percent}%`}</span>
    {total > 0 && <progress value={Math.min(done, total)} max={total} aria-label={`Postęp serialu ${item.title}`} />}
    {next && <small>Następny na liście: {next}</small>}
  </div>
}
