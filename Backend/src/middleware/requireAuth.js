const { resolveAuthUser } = require('../lib/supabase')
const { getPrisma } = require('../lib/prisma')
const { AppError } = require('../utils/appError')

function extractBearerToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

async function requireSupabaseUser(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'test') {
      const testUserId = req.headers['x-test-user-id']
      if (testUserId) {
        req.supabaseUser = { id: `test-${testUserId}`, email: 'test@test.local' }
        return next()
      }
    }
    const token = extractBearerToken(req)
    if (!token) {
      throw new AppError('Authentication required.', 401)
    }
    const supabaseUser = await resolveAuthUser(token)
    if (!supabaseUser) {
      throw new AppError('Invalid or expired session token.', 401)
    }
    req.supabaseUser = supabaseUser
    next()
  } catch (err) {
    next(err)
  }
}

async function requireAuth(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'test') {
      const testUserId = req.headers['x-test-user-id']
      if (testUserId) {
        const prisma = await getPrisma()
        const localUser = await prisma.user.findUnique({
          where: { id: parseInt(testUserId, 10) },
          select: { id: true, authUserId: true, email: true, name: true },
        })
        if (!localUser) {
          throw new AppError('Test user not found.', 401)
        }
        req.supabaseUser = { id: localUser.authUserId, email: localUser.email }
        req.user = {
          id: localUser.id,
          supabaseAuthUserId: localUser.authUserId,
          email: localUser.email,
          name: localUser.name,
        }
        return next()
      }
    }
    const token = extractBearerToken(req)
    if (!token) {
      throw new AppError('Authentication required.', 401)
    }
    const supabaseUser = await resolveAuthUser(token)
    if (!supabaseUser) {
      throw new AppError('Invalid or expired session token.', 401)
    }
    const prisma = await getPrisma()
    const localUser = await prisma.user.findUnique({
      where: { authUserId: supabaseUser.id },
      select: { id: true, authUserId: true, email: true, name: true },
    })
    if (!localUser) {
      throw new AppError('No local user is linked to this session.', 403)
    }
    req.supabaseUser = supabaseUser
    req.user = {
      id: localUser.id,
      supabaseAuthUserId: supabaseUser.id,
      email: localUser.email,
      name: localUser.name,
    }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { requireAuth, requireSupabaseUser }