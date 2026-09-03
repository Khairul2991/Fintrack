import { get, post, put, del } from './api'

export function listAccounts() {
  return get('/accounts')
}

export function getAccount(id) {
  return get(`/accounts/${id}`)
}

export function createAccount(payload) {
  return post('/accounts', payload)
}

export function updateAccount(id, payload) {
  return put(`/accounts/${id}`, payload)
}

export function deleteAccount(id) {
  return del(`/accounts/${id}`)
}