import { get, post, put, del } from './api'

export function listTransactions(params) {
  return get('/transactions', params)
}

export function createTransaction(payload) {
  return post('/transactions', payload)
}

export function updateTransaction(id, payload) {
  return put(`/transactions/${id}`, payload)
}

export function deleteTransaction(id) {
  return del(`/transactions/${id}`)
}