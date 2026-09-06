const DEV_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

function parseOrigins(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

function allowedOrigins() {
  const configured = process.env.FRONTEND_URL
  if (configured) {
    return parseOrigins(configured)
  }
  if (process.env.NODE_ENV === 'production') {
    return []
  }
  return DEV_ALLOWED_ORIGINS
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin
  if (!origin) {
    return next()
  }

  let originHost = null
  try {
    originHost = new URL(origin).host
  } catch {
    originHost = null
  }
  const sameOrigin = !!originHost && originHost === req.headers.host
  const allowed = sameOrigin || allowedOrigins().includes(origin)

  if (!allowed) {
    return next()
  }

  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
}

module.exports = { corsMiddleware }