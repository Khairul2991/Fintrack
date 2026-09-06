import { get } from './api'

export function getReportOverview() {
  return get('/reports/overview')
}

export function getMonthlyReport() {
  return get('/reports/monthly')
}

export function getCategoryReport() {
  return get('/reports/categories')
}