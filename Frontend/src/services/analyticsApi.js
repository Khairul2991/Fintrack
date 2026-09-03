import { get } from './api'

export function getAnalytics() {
  return get('/analytics/summary')
}