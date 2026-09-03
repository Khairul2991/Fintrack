import { get, post, put, patch, del } from './api'

export function listGoals() {
  return get('/goals')
}

export function getGoal(id) {
  return get(`/goals/${id}`)
}

export function createGoal(payload) {
  return post('/goals', payload)
}

export function updateGoal(id, payload) {
  return put(`/goals/${id}`, payload)
}

export function updateGoalProgress(id, currentAmount) {
  return patch(`/goals/${id}/progress`, { currentAmount })
}

export function deleteGoal(id) {
  return del(`/goals/${id}`)
}