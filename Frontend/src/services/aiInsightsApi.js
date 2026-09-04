import { get } from './api'

export function getAiInsights(params) {
  return get('/ai-insights', params)
}