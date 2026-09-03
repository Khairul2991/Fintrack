import { get, post, put, patch, del } from './api'

export function listRecurringTransactions() {
  return get('/recurring-transactions')
}

export function getRecurringTransaction(id) {
  return get(`/recurring-transactions/${id}`)
}

export function createRecurringTransaction(payload) {
  return post('/recurring-transactions', payload)
}

export function updateRecurringTransaction(id, payload) {
  return put(`/recurring-transactions/${id}`, payload)
}

export function setRecurringTransactionActive(id, active) {
  return patch(`/recurring-transactions/${id}/active`, { active })
}

export function deleteRecurringTransaction(id) {
  return del(`/recurring-transactions/${id}`)
}