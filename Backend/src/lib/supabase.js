const { createClient } = require('@supabase/supabase-js')

let supabasePromise = null

function getSupabase() {
  if (!supabasePromise) {
    supabasePromise = (async () => {
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_SECRET_KEY
      if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the backend environment.')
      }
      return createClient(url, key)
    })()
  }
  return supabasePromise
}

async function resolveAuthUser(bearerToken) {
  const supabase = await getSupabase()
  const { data, error } = await supabase.auth.getUser(bearerToken)
  if (error || !data || !data.user) {
    return null
  }
  return data.user
}

module.exports = { getSupabase, resolveAuthUser }