import { get, getBlob } from './api'

export function exportTransactions(params) {
  return get('/export/transactions', params)
}

export async function fetchReportPdf(lang = 'en') {
  return getBlob('/reports/pdf', { lang })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}