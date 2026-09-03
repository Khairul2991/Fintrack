const API_BASE = '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const { body, ...rest } = options
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    })
  } catch {
    throw new ApiError('Unable to reach the server. Is the backend running?', 0)
  }

  const data = await parseJson(response)

  if (!response.ok) {
    const message = data && typeof data.message === 'string' ? data.message : 'Something went wrong.'
    throw new ApiError(message, response.status)
  }

  return data || {}
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