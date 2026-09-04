const AI_TIMEOUT_MS = 15000
const AI_MAX_INSIGHTS = 7
const AI_MIN_INSIGHTS = 3

function aiConfig() {
  const provider = (process.env.AI_PROVIDER || '').trim()
  if (!provider) return null
  return {
    provider,
    apiKey: (process.env.AI_API_KEY || '').trim(),
    model: (process.env.AI_MODEL || '').trim() || 'gpt-4o-mini',
    timeoutMs: AI_TIMEOUT_MS,
    maxInsights: AI_MAX_INSIGHTS,
    minInsights: AI_MIN_INSIGHTS,
  }
}

module.exports = { aiConfig, AI_TIMEOUT_MS, AI_MAX_INSIGHTS, AI_MIN_INSIGHTS }