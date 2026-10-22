import mongoose from 'mongoose'

export function createModels(connection) {
  const user = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
  }, { timestamps: true })
  const library = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ['movie', 'tv'], required: true },
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    status: { type: String, enum: ['watchlist', 'watching', 'watched'], required: true },
    episodes: { type: [String], default: [] },
  }, { timestamps: true })
  library.index({ userId: 1, mediaType: 1, tmdbId: 1 }, { unique: true })
  const review = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    userName: { type: String, required: true },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ['movie', 'tv'], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String, default: '' },
  }, { timestamps: true })
  review.index({ mediaType: 1, tmdbId: 1, userId: 1 }, { unique: true })
  return {
    User: connection.model('User', user),
    Library: connection.model('Library', library),
    Review: connection.model('Review', review),
  }
}
