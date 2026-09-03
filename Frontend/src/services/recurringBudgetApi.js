import { get, post, put, patch, del } from './api'

export function listRecurringBudgets() {
  return get('/recurring-budgets')
}

export function getRecurringBudget(id) {
  return get(`/recurring-budgets/${id}`)
}

export function createRecurringBudget(payload) {
  return post('/recurring-budgets', payload)
}

export function updateRecurringBudget(id, payload) {
  return put(`/recurring-budgets/${id}`, payload)
}

export function setRecurringBudgetActive(id, active) {
  return patch(`/recurring-budgets/${id}/active`, { active })
}

export function deleteRecurringBudget(id) {
  return del(`/recurring-budgets/${id}`)
}