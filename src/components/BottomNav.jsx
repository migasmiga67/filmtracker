import { NavLink } from 'react-router-dom'

const icons = {
  home: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  search: 'M11 4a7 7 0 105 11.9l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0011 4z',
  library: 'M4 5h16v16H4zM8 2h8M8 9h8M8 13h5',
  discover: 'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z',
  stats: 'M5 20V10M12 20V4M19 20v-7',
}

const Icon = ({ d, stroke }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Główna nawigacja">
      <NavLink to="/" end><Icon d={icons.home} /><span>Start</span></NavLink>
      <NavLink to="/discover"><Icon d={icons.discover} stroke /><span>Odkrywaj</span></NavLink>
      <NavLink to="/search"><Icon d={icons.search} /><span>Szukaj</span></NavLink>
      <NavLink to="/library"><Icon d={icons.library} stroke /><span>Biblioteka</span></NavLink>
      <NavLink to="/stats"><Icon d={icons.stats} stroke /><span>Statystyki</span></NavLink>
    </nav>
  )
}
