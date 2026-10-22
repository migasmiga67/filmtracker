import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { createModels } from '../src/models.js'
import { createApp } from '../src/app.js'

// A unique database is created and dropped by each run; application databases are never dropped.
test('API integration with MongoDB', async (t) => {
  const connection = await mongoose.createConnection(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', {
    dbName: `klaps_test_${randomUUID().replaceAll('-', '')}`, serverSelectionTimeoutMS: 5000,
  }).asPromise()
  t.after(async () => { await connection.dropDatabase(); await connection.close() })
  const models = createModels(connection)
  await Promise.all(Object.values(models).map((m) => m.init()))
  const jwtSecret = randomUUID() + randomUUID()
  const app = createApp({ models, jwtSecret, corsOrigins: ['http://localhost:5173'], authLimit: 100 })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}/api`
  async function request(path, { token, body, method = 'GET', headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, data: await response.json(), headers: response.headers }
  }
  let alice, bob
  await t.test('health and CORS', async () => {
    assert.equal((await request('/health')).status, 200)
    assert.equal((await request('/health', { headers: { Origin: 'https://evil.invalid' } })).status, 403)
    const allowed = await request('/health', { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    const preflight = await fetch(base + '/library', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } })
    assert.equal(preflight.status, 204)
  })
  await t.test('registration normalizes email and stores only a password hash', async () => {
    const r = await request('/auth/register', { method: 'POST', body: { name: ' Alice ', email: 'ALICE@example.com', password: 'testing123' } })
    assert.equal(r.status, 201); alice = r.data
    assert.deepEqual(Object.keys(alice.user).sort(), ['email', 'id', 'name'])
    assert.equal(alice.user.name, 'Alice'); assert.equal(alice.user.email, 'alice@example.com')
    const stored = await models.User.findById(alice.user.id).select('+passwordHash')
    assert.notEqual(stored.passwordHash, 'testing123'); assert.match(stored.passwordHash, /^\$2/)
    bob = (await request('/auth/register', { method: 'POST', body: { name: 'Bob', email: 'bob@example.com', password: 'testing456' } })).data
  })
  await t.test('duplicate registration and invalid account fields', async () => {
    assert.equal((await request('/auth/register', { method: 'POST', body: { name: 'Other', email: 'alice@example.com', password: 'testing123' } })).status, 409)
    for (const body of [{ name: '', email: 'bad', password: 'short' }, { name: 'X', email: 'x@example.com', password: 'ą'.repeat(40) }]) {
      assert.equal((await request('/auth/register', { method: 'POST', body })).status, 400)
    }
  })
  await t.test('login and authenticated current user', async () => {
    const r = await request('/auth/login', { method: 'POST', body: { email: 'ALICE@example.com', password: 'testing123' } })
    assert.equal(r.status, 200)
    assert.deepEqual((await request('/auth/me', { token: r.data.token })).data, alice.user)
    assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'alice@example.com', password: 'incorrect' } })).status, 401)
  })
  await t.test('protected routes reject absent, forged and expired tokens', async () => {
    const expired = jwt.sign({}, jwtSecret, { subject: alice.user.id, expiresIn: -1, issuer: 'klaps', audience: 'klaps-web' })
    for (const token of [undefined, 'forged', expired]) assert.equal((await request('/library', { token })).status, 401)
    assert.equal((await request('/auth/me')).status, 401)
  })
  const item = { tmdbId: 603, mediaType: 'movie', title: 'Matrix', posterPath: '/matrix.jpg', status: 'watchlist', episodes: [] }
  await t.test('library upsert uses path identity and isolates owners', async () => {
    const first = await request('/library/movie/603', { token: alice.token, method: 'PUT', body: { ...item, userId: bob.user.id, updatedAt: '1900-01-01' } })
    assert.equal(first.status, 200); assert.equal(first.data.title, 'Matrix')
    assert.notEqual(first.data.updatedAt.slice(0,4), '1900'); assert.equal(first.data.userId, undefined)
    await request('/library/movie/603', { token: alice.token, method: 'PUT', body: { ...item, status: 'watched' } })
    assert.equal((await request('/library', { token: alice.token })).data.length, 1)
    assert.equal((await request('/library', { token: bob.token })).data.length, 0)
    await request('/library/movie/603', { token: bob.token, method: 'DELETE' })
    assert.equal((await request('/library', { token: alice.token })).data.length, 1)
  })
  await t.test('rejects invalid media, IDs, statuses, poster paths and episode data', async () => {
    for (const path of ['/library/invalid/603', '/library/movie/-1', '/library/movie/1.2', '/library/movie/9007199254740992']) {
      assert.equal((await request(path, { token: alice.token, method: 'PUT', body: item })).status, 400)
    }
    for (const patch of [{ status: 'invalid' }, { status: 'watching' }, { title: '' }, { posterPath: 'https://evil.invalid' }, { episodes: ['1x1'] }]) {
      assert.equal((await request('/library/movie/603', { token: alice.token, method: 'PUT', body: { ...item, ...patch } })).status, 400)
    }
    const series = await request('/library/tv/99', { token: alice.token, method: 'PUT', body: { ...item, status: 'watching', episodes: ['1x1', '1x1', '2x1'] } })
    assert.equal(series.status, 200); assert.deepEqual(series.data.episodes, ['1x1', '2x1']); assert.equal(series.data.tmdbId, 99)
  })
  await t.test('reviews aggregate ratings and hide private identifiers', async () => {
    assert.equal((await request('/reviews/movie/603', { token: alice.token })).data.count, 0)
    for (const [token, rating, text] of [[alice.token, 5, ' Świetny! '], [bob.token, 3, '']]) {
      assert.equal((await request('/reviews/movie/603', { token, method: 'PUT', body: { rating, text } })).status, 200)
    }
    const result = (await request('/reviews/movie/603', { token: bob.token })).data
    assert.equal(result.average, 4); assert.equal(result.count, 2); assert.equal(result.mine.rating, 3)
    assert.equal(result.reviews.length, 1); assert.equal(result.reviews[0].text, 'Świetny!')
    assert.deepEqual(Object.keys(result.reviews[0]).sort(), ['rating','text','updatedAt','userName'])
    await request('/reviews/movie/603', { token: alice.token, method: 'PUT', body: { rating: 1, text: 'Zmiana' } })
    assert.equal((await request('/reviews/movie/603', { token: alice.token })).data.average, 2)
    assert.equal(await models.Review.countDocuments(), 2)
  })
  await t.test('invalid ratings and oversized reviews are rejected', async () => {
    for (const body of [{ rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: '5' }, { rating: 5, text: 'a'.repeat(1001) }]) {
      assert.equal((await request('/reviews/movie/603', { token: alice.token, method: 'PUT', body })).status, 400)
    }
  })
  await t.test('new metadata persists, validates and remains backward compatible', async () => {
    const enriched = { ...item, year: '1999', genres: ['Science fiction'], tmdbRating: 8.7, runtime: 136, metadataVersion: 1 }
    const r = await request('/library/movie/603', { token: alice.token, method: 'PUT', body: enriched })
    assert.equal(r.status, 200); assert.equal(r.data.runtime,136); assert.equal(r.data.tmdbRating,8.7); assert.ok(r.data.createdAt)
    assert.deepEqual(r.data.genres,['Science fiction'])
    assert.equal((await request('/library/movie/603', { token: alice.token, method: 'PUT', body: { ...enriched, runtime: -1 } })).status,400)
    assert.equal((await request('/library/movie/603', { token: alice.token, method: 'PUT', body: { ...enriched, tmdbRating: 11 } })).status,400)
  })
  await t.test('collection CRUD and membership are private, idempotent and survive library edits', async () => {
    const created=await request('/collections',{token:alice.token,method:'POST',body:{name:' Weekend '}})
    assert.equal(created.status,201);assert.equal(created.data.name,'Weekend')
    const id=created.data.id
    assert.equal((await request('/collections',{token:bob.token})).data.length,0)
    for(const method of ['PUT','DELETE']) assert.equal((await request(`/collections/${id}`,{token:bob.token,method,body:method==='PUT'?{name:'Hijack'}:undefined})).status,404)
    assert.equal((await request(`/collections/${id}/items/tv/99`,{token:bob.token,method:'PUT'})).status,400)
    for(let i=0;i<2;i++) assert.equal((await request(`/collections/${id}/items/movie/603`,{token:alice.token,method:'PUT'})).status,200)
    assert.deepEqual((await request('/collections',{token:alice.token})).data[0].items,[{mediaType:'movie',tmdbId:603}])
    await request(`/collections/${id}`,{token:alice.token,method:'PUT',body:{name:'Na wieczór'}})
    assert.equal((await request('/collections',{token:alice.token})).data[0].name,'Na wieczór')
    await request(`/collections/${id}/items/movie/603`,{token:alice.token,method:'DELETE'})
    assert.equal((await request('/collections',{token:alice.token})).data[0].items.length,0)
    await request(`/collections/${id}/items/movie/603`,{token:alice.token,method:'PUT'})
    await request('/library/movie/603',{token:alice.token,method:'DELETE'})
    assert.equal((await request('/collections',{token:alice.token})).data[0].items.length,0)
    await request('/library/movie/603',{token:alice.token,method:'PUT',body:item})
    await request(`/collections/${id}`,{token:alice.token,method:'DELETE'})
    assert.equal((await request('/library',{token:alice.token})).data.length,2)
    assert.equal((await request('/collections',{token:alice.token})).data.length,0)
    assert.equal((await request('/collections',{token:alice.token,method:'POST',body:{name:'  '}})).status,400)
    assert.equal((await request('/collections/not-an-id',{token:alice.token,method:'DELETE'})).status,400)
  })
  await t.test('delete is idempotent and writes persist across a new DB connection', async () => {
    const second = await mongoose.createConnection(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', { dbName: connection.name }).asPromise()
    try { assert.equal(await createModels(second).Library.countDocuments({ userId: alice.user.id }), 2) } finally { await second.close() }
    for (let i = 0; i < 2; i++) assert.deepEqual((await request('/library/movie/603', { token: alice.token, method: 'DELETE' })).data, { ok: true })
    assert.equal((await request('/library', { token: alice.token })).data.length, 1)
  })
  await t.test('JSON errors, payload limits and unknown routes return JSON', async () => {
    const malformed = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' })
    assert.equal(malformed.status, 400); assert.ok((await malformed.json()).message)
    assert.equal((await request('/auth/login', { method: 'POST', body: { email: 'a'.repeat(140000) } })).status, 413)
    assert.equal((await request('/unknown', { token: alice.token })).status, 404)
  })
  await t.test('login rate limit returns 429', async () => {
    const limited = createApp({ models, jwtSecret, corsOrigins: [], authLimit: 1 }).listen(0, '127.0.0.1')
    await once(limited, 'listening')
    try {
      const url = `http://127.0.0.1:${limited.address().port}/api/auth/login`
      const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      assert.equal((await fetch(url, options)).status, 400)
      const response = await fetch(url, options); assert.equal(response.status, 429); assert.ok((await response.json()).message)
    } finally { await new Promise((resolve) => limited.close(resolve)) }
  })
})
