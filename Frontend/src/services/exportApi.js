import { get } from './api'
import { ApiError } from './api'

export function exportTransactions(params) {
  return get('/export/transactions', params)
}

export async function fetchReportPdf(lang = 'en') {
  try {
    const response = await fetch(`/api/reports/pdf?lang=${lang}`)
    if (!response.ok) {
      throw new ApiError('Unable to download the report.', response.status)
    }
    return await response.blob()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Unable to download the report. Is the backend running?', 0)
  }
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