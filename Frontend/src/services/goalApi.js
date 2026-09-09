import { get, post, put, del } from './api'

export function listGoals() {
  return get('/goals')
}

export function getGoalsOverview() {
  return get('/goals/overview')
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

export function deleteGoal(id) {
  return del(`/goals/${id}`)
}