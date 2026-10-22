import mongoose from 'mongoose'
import { createModels } from './models.js'
import { createApp } from './app.js'

const { MONGODB_URI, JWT_SECRET } = process.env
const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '0.0.0.0'
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()).filter(Boolean)
if (!MONGODB_URI) throw new Error('Ustaw MONGODB_URI w backend/.env')
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('Ustaw JWT_SECRET (minimum 32 znaki) w backend/.env')
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Nieprawidłowy PORT')
for (const origin of corsOrigins) {
  if (new URL(origin).origin !== origin) throw new Error('CORS_ORIGINS musi zawierać pełne źródła bez ścieżek')
}
const connection = await mongoose.createConnection(MONGODB_URI, { serverSelectionTimeoutMS: 10000 }).asPromise()
const models = createModels(connection)
await Promise.all(Object.values(models).map((model) => model.init()))
const app = createApp({ models, jwtSecret: JWT_SECRET, corsOrigins, isReady: () => connection.readyState === 1 })
const server = app.listen(port, host, () => console.log(`Klaps API listening on port ${port}`))
let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  const timer = setTimeout(() => process.exit(1), 10000).unref()
  server.close(async () => {
    await connection.close()
    clearTimeout(timer)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
