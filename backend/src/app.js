import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const credentials = z.object({
  email: z.string().trim().email().max(254).transform((s) => s.toLowerCase()),
  password: z.string().min(6).refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'Hasło może mieć maksymalnie 72 bajty'),
})
const registration = credentials.extend({ name: z.string().trim().min(1).max(80) })
const targetSchema = z.object({
  mediaType: z.enum(['movie', 'tv']),
  tmdbId: z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger),
})
const itemSchema = z.object({
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().max(300).regex(/^\/[a-zA-Z0-9_./-]+$/).nullable().optional().default(null),
  status: z.enum(['watchlist', 'watching', 'watched']),
  episodes: z.array(z.string().regex(/^[1-9]\d*x[1-9]\d*$/)).max(10000).optional().default([]).transform((v) => [...new Set(v)]),
})
const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), text: z.string().trim().max(1000).optional().default('') })
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email })
const publicItem = (i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType, title: i.title, posterPath: i.posterPath, status: i.status, episodes: i.episodes, updatedAt: i.updatedAt })
const publicReview = (r) => ({ userName: r.userName, rating: r.rating, text: r.text, updatedAt: r.updatedAt })

export function createApp({ models, jwtSecret, corsOrigins, isReady = () => true, authLimit = 20 }) {
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET musi mieć co najmniej 32 znaki')
  const { User, Library, Review } = models
  const app = express()
  app.disable('x-powered-by')
  // Keep Express's default trust proxy=false. Configure only known proxy hops when deploying.
  app.use(helmet())
  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true)
      callback(Object.assign(new Error('Niedozwolone źródło żądania'), { status: 403 }))
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  }))
  app.use(express.json({ limit: '128kb' }))
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  app.get('/api/health', (req, res) => res.status(isReady() ? 200 : 503).json({ status: isReady() ? 'ok' : 'unavailable' }))
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: authLimit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ message: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.' }),
  })
  const issueToken = (user) => jwt.sign({}, jwtSecret, { subject: String(user._id), expiresIn: '7d', algorithm: 'HS256', issuer: 'klaps', audience: 'klaps-web' })
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { name, email, password } = registration.parse(req.body)
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash })
    res.status(201).json({ token: issueToken(user), user: publicUser(user) })
  })
  // Equalize password verification work when the account does not exist.
  const dummyHash = bcrypt.hashSync('unused-login-comparison', 12)
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const { email, password } = credentials.parse(req.body)
    const user = await User.findOne({ email }).select('+passwordHash')
    const valid = await bcrypt.compare(password, user?.passwordHash || dummyHash)
    if (!user || !valid) return res.status(401).json({ message: 'Nieprawidłowy e-mail lub hasło' })
    res.json({ token: issueToken(user), user: publicUser(user) })
  })
  app.use('/api', async (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '')
    if (!match) return res.status(401).json({ message: 'Zaloguj się, aby kontynuować' })
    let payload
    try {
      payload = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'], issuer: 'klaps', audience: 'klaps-web' })
    } catch {
      return res.status(401).json({ message: 'Sesja wygasła. Zaloguj się ponownie' })
    }
    if (!/^[a-f\d]{24}$/i.test(payload.sub || '')) return res.status(401).json({ message: 'Nieprawidłowa sesja' })
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: 'Nieprawidłowa sesja' })
    req.user = user
    next()
  })
  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)))
  app.get('/api/library', async (req, res) => {
    const items = await Library.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean()
    res.json(items.map(publicItem))
  })
  app.put('/api/library/:mediaType/:tmdbId', async (req, res) => {
    const target = targetSchema.parse(req.params)
    const data = itemSchema.parse(req.body)
    if (target.mediaType === 'movie' && (data.status === 'watching' || data.episodes.length)) {
      return res.status(400).json({ message: 'Film nie ma odcinków. Wybierz „Do obejrzenia” lub „Obejrzane”.' })
    }
    const item = await Library.findOneAndUpdate({ userId: req.user._id, ...target }, { $set: data }, { upsert: true, returnDocument: 'after', runValidators: true })
    res.json(publicItem(item))
  })
  app.delete('/api/library/:mediaType/:tmdbId', async (req, res) => {
    await Library.deleteOne({ userId: req.user._id, ...targetSchema.parse(req.params) })
    res.json({ ok: true })
  })
  app.get('/api/reviews/:mediaType/:tmdbId', async (req, res) => {
    const reviews = await Review.find(targetSchema.parse(req.params)).sort({ updatedAt: -1 }).lean()
    const mine = reviews.find((r) => String(r.userId) === String(req.user._id))
    res.json({
      average: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
      count: reviews.length,
      mine: mine ? publicReview(mine) : null,
      reviews: reviews.filter((r) => r.text).map(publicReview),
    })
  })
  app.put('/api/reviews/:mediaType/:tmdbId', async (req, res) => {
    const target = targetSchema.parse(req.params)
    const review = await Review.findOneAndUpdate({ userId: req.user._id, ...target }, {
      $set: { ...reviewSchema.parse(req.body), userName: req.user.name },
    }, { upsert: true, returnDocument: 'after', runValidators: true })
    res.json(publicReview(review))
  })
  app.use((req, res) => res.status(404).json({ message: 'Nie znaleziono zasobu' }))
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError) return res.status(400).json({ message: 'Nieprawidłowe dane żądania', errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })) })
    if (err.code === 11000) return res.status(409).json({ message: 'Wpis już istnieje. Konto z tym adresem e-mail może być już zarejestrowane.' })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Nieprawidłowy JSON' })
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Żądanie jest zbyt duże' })
    if (err.status === 403) return res.status(403).json({ message: err.message })
    console.error('API error:', err.name)
    res.status(500).json({ message: 'Błąd serwera. Spróbuj ponownie później.' })
  })
  return app
}
