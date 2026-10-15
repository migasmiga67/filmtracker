import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import WatchedPage from './pages/WatchedPage'
import TitlePage from './pages/TitlePage'
import { isMock } from './api'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <p className="state">Ładowanie…</p>
  if (!user) return <AuthPage />

  return (
    <div className="shell">
      {isMock && (
        <p className="mock-banner">Tryb lokalny: dane zapisują się tylko w tej przeglądarce.</p>
      )}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/watched" element={<WatchedPage />} />
          <Route path="/title/:type/:id" element={<TitlePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
