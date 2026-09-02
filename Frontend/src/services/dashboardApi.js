import { get } from './api'

export function getDashboardSummary() {
  return get('/dashboard/summary')
}