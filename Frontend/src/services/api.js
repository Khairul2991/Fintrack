const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '')

let getTokenFn = null

export function setTokenProvider(fn) {
  getTokenFn = fn
}

export function clearCache() {
  cache.clear()
  inflight.clear()
  epochs.clear()
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const DEFAULT_GET_TTL = 120000
const LONG_GET_TTL = 300000
const cache = new Map()
const inflight = new Map()
const epochs = new Map()

function getTtl(path) {
  if (path === '/categories' || path === '/accounts') return LONG_GET_TTL
  return DEFAULT_GET_TTL
}

function bucketFor(token) {
  return token ? token : ''
}

function invalidateBucket(bucket) {
  if (!bucket) return
  epochs.set(bucket, (epochs.get(bucket) || 0) + 1)
  const prefix = `${bucket}::`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key)
  }
}

function cacheKey(token, path) {
  return `${bucketFor(token)}::GET:${path}`
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const { body, headers: customHeaders, ...rest } = options

  const headers = { ...customHeaders }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  let token = null
  if (getTokenFn) {
    token = await getTokenFn()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const isGet = !rest.method || rest.method === 'GET'
  const key = isGet && token ? cacheKey(token, path) : null

  if (key) {
    const hit = cache.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      return structuredClone(hit.value)
    }
    const pending = inflight.get(key)
    if (pending) {
      return pending
    }
  }

  const serialize = async () => {
    let response
    try {
      response = await fetch(`${API_BASE}${path}`, {
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...rest,
      })
    } catch {
      throw new ApiError('Unable to reach the server. Is the backend running?', 0)
    }

    if (response.status === 401) {
      throw new ApiError('Session expired. Please log in again.', 401)
    }

    const data = await parseJson(response)

    if (!response.ok) {
      const message = data && typeof data.message === 'string' ? data.message : 'Something went wrong.'
      throw new ApiError(message, response.status)
    }

    if (token) {
      if (isGet) {
        cache.set(key, {
          value: structuredClone(data || {}),
          expiresAt: Date.now() + getTtl(path),
        })
      } else {
        invalidateBucket(bucketFor(token))
      }
    }

    return data || {}
  }

  if (key) {
    const started = epochs.get(bucketFor(token)) || 0
    const promise = serialize()
      .then((value) => {
        if ((epochs.get(bucketFor(token)) || 0) !== started) {
          cache.delete(key)
        }
        return value
      })
      .finally(() => {
        inflight.delete(key)
      })
    inflight.set(key, promise)
    return promise
  }

  return serialize()
}

export function get(path, params) {
  const query = buildQuery(params)
  return request(query ? `${path}?${query}` : path)
}

export function post(path, payload) {
  return request(path, { method: 'POST', body: payload })
}

export function put(path, payload) {
  return request(path, { method: 'PUT', body: payload })
}

export function del(path) {
  return request(path, { method: 'DELETE' })
}

export function patch(path, payload) {
  return request(path, { method: 'PATCH', body: payload })
}

function buildQuery(params) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value)
    }
  }
  return search.toString()
}