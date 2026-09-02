import { get, post, put, del } from './api'

export function listBudgets(params) {
  return get('/budgets', params)
}

export function createBudget(payload) {
  return post('/budgets', payload)
}

export function updateBudget(id, payload) {
  return put(`/budgets/${id}`, payload)
}

export function deleteBudget(id) {
  return del(`/budgets/${id}`)
}