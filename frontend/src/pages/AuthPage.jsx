import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const isRegister = mode === 'register'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (isRegister && form.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return
    }
    setBusy(true)
    try {
      if (isRegister) await register(form.name.trim(), form.email, form.password)
      else await login(form.email, form.password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-brand">
        <h1>Klaps</h1>
        <p>Zapisuj, co obejrzałeś. Wiedz, na którym odcinku skończyłeś.</p>
      </div>

      <form onSubmit={submit} className="auth-form">
        <h2>{isRegister ? 'Załóż konto' : 'Zaloguj się'}</h2>

        {isRegister && (
          <label>
            Nazwa użytkownika
            <input value={form.name} onChange={set('name')} required autoComplete="nickname" />
          </label>
        )}
        <label>
          E-mail
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>
          Hasło
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Chwileczkę…' : isRegister ? 'Załóż konto' : 'Zaloguj się'}
        </button>

        <button
          type="button"
          className="btn link"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register')
            setError('')
          }}
        >
          {isRegister ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
        </button>
      </form>
    </div>
  )
}
