import { get } from './api'

export function getMonthlyReport() {
  return get('/reports/monthly')
}

export function getCategoryReport() {
  return get('/reports/categories')
}