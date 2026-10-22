// Klient API aplikacji. Dwa tryby:
//  - VITE_USE_MOCK=true  -> dane w localStorage (do pracy bez backendu)
//  - VITE_USE_MOCK=false -> prawdziwe API w Node.js (kontrakt w README.md)

const MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'klaps_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/* ---------- prawdziwe API ---------- */

async function http(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Brak połączenia z serwerem')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || 'Coś poszło nie tak')
  return data
}

const real = {
  register: (name, email, password) =>
    http('/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) =>
    http('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => http('/auth/me'),
  getCollections: () => http('/collections'),
  createCollection: (name) => http('/collections', { method: 'POST', body: { name } }),
  renameCollection: (id, name) => http(`/collections/${id}`, { method: 'PUT', body: { name } }),
  deleteCollection: (id) => http(`/collections/${id}`, { method: 'DELETE' }),
  setCollectionItem: (id, type, tmdbId, added) => http(`/collections/${id}/items/${type}/${tmdbId}`, { method: added ? 'PUT' : 'DELETE' }),
  getLibrary: () => http('/library'),
  saveItem: (item) =>
    http(`/library/${item.mediaType}/${item.tmdbId}`, { method: 'PUT', body: item }),
  removeItem: (type, id) => http(`/library/${type}/${id}`, { method: 'DELETE' }),
  getReviews: (type, id) => http(`/reviews/${type}/${id}`),
  saveReview: (type, id, review) =>
    http(`/reviews/${type}/${id}`, { method: 'PUT', body: review }),
}

/* ---------- tryb lokalny (mock) ---------- */

const DB_KEY = 'klaps_mock_db'
const readDb = () =>
  JSON.parse(localStorage.getItem(DB_KEY) || '{"users":[],"library":{},"reviews":{}}')
const writeDb = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db))
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 150))
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email })
const currentUser = (db) => {
  const u = db.users.find((x) => x.id === getToken())
  if (!u) throw new Error('Sesja wygasła, zaloguj się ponownie')
  return u
}

const mock = {
  async register(name, email, password) {
    const db = readDb()
    if (db.users.some((u) => u.email === email.toLowerCase()))
      throw new Error('Konto z tym adresem e-mail już istnieje')
    const user = { id: crypto.randomUUID(), name, email: email.toLowerCase(), password }
    db.users.push(user)
    writeDb(db)
    return delay({ token: user.id, user: publicUser(user) })
  },
  async login(email, password) {
    const u = readDb().users.find(
      (x) => x.email === email.toLowerCase() && x.password === password
    )
    if (!u) throw new Error('Nieprawidłowy e-mail lub hasło')
    return delay({ token: u.id, user: publicUser(u) })
  },
  async me() {
    return delay(publicUser(currentUser(readDb())))
  },
  async getLibrary() {
    const db = readDb()
    const u = currentUser(db)
    return delay(Object.values(db.library[u.id] || {}))
  },
  async saveItem(item) {
    const db = readDb()
    const u = currentUser(db)
    db.library[u.id] ||= {}
    item = { ...item, createdAt: db.library[u.id][`${item.mediaType}-${item.tmdbId}`]?.createdAt || new Date().toISOString() }
    db.library[u.id][`${item.mediaType}-${item.tmdbId}`] = item
    writeDb(db)
    return delay(item)
  },
  async removeItem(type, id) {
    const db = readDb()
    const u = currentUser(db)
    delete (db.library[u.id] || {})[`${type}-${id}`]
    for (const c of Object.values(db.collections?.[u.id] || {})) c.items = c.items.filter((i) => !(i.mediaType === type && i.tmdbId === Number(id)))
    writeDb(db)
    return delay({ ok: true })
  },
  async getCollections() {
    const db = readDb(), u = currentUser(db)
    return delay(Object.values(db.collections?.[u.id] || {}))
  },
  async createCollection(name) {
    if (!name.trim() || name.trim().length > 80) throw new Error('Nazwa kolekcji musi mieć od 1 do 80 znaków')
    const db = readDb(), u = currentUser(db)
    db.collections ||= {}; db.collections[u.id] ||= {}
    const c = { id: crypto.randomUUID(), name: name.trim(), items: [] }
    db.collections[u.id][c.id] = c; writeDb(db)
    return delay(c)
  },
  async renameCollection(id, name) {
    if (!name.trim() || name.trim().length > 80) throw new Error('Nazwa kolekcji musi mieć od 1 do 80 znaków')
    const db = readDb(), u = currentUser(db), c = db.collections?.[u.id]?.[id]
    if (!c) throw new Error('Nie znaleziono kolekcji')
    c.name = name.trim(); writeDb(db); return delay(c)
  },
  async deleteCollection(id) {
    const db = readDb(), u = currentUser(db)
    if (!db.collections?.[u.id]?.[id]) throw new Error('Nie znaleziono kolekcji')
    delete db.collections[u.id][id]; writeDb(db); return delay({ ok: true })
  },
  async setCollectionItem(id, type, tmdbId, added) {
    const db = readDb(), u = currentUser(db), c = db.collections?.[u.id]?.[id]
    if (!c) throw new Error('Nie znaleziono kolekcji')
    if (added && !db.library[u.id]?.[`${type}-${tmdbId}`]) throw new Error('Najpierw dodaj tytuł do biblioteki')
    c.items = c.items.filter((i) => !(i.mediaType === type && i.tmdbId === Number(tmdbId)))
    if (added) c.items.push({ mediaType: type, tmdbId: Number(tmdbId) })
    writeDb(db); return delay(c)
  },
  async getReviews(type, id) {
    const db = readDb()
    const u = currentUser(db)
    const list = db.reviews[`${type}-${id}`] || []
    const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0
    return delay({
      average,
      count: list.length,
      mine: list.find((r) => r.userId === u.id) || null,
      reviews: list
        .filter((r) => r.text)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ userId, ...r }) => r),
    })
  },
  async saveReview(type, id, { rating, text }) {
    const db = readDb()
    const u = currentUser(db)
    const key = `${type}-${id}`
    const list = (db.reviews[key] ||= [])
    const entry = {
      userId: u.id,
      userName: u.name,
      rating,
      text: text || '',
      updatedAt: new Date().toISOString(),
    }
    const i = list.findIndex((r) => r.userId === u.id)
    if (i >= 0) list[i] = entry
    else list.push(entry)
    writeDb(db)
    return delay(entry)
  },
}

export const api = MOCK ? mock : real
export const isMock = MOCK
