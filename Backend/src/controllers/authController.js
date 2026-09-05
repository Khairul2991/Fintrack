const { success } = require('../utils/apiResponse')
const authService = require('../services/authService')

function identityFromToken(req) {
  return {
    authUserId: req.supabaseUser.id,
    email: req.supabaseUser.email,
    name: req.supabaseUser.user_metadata && req.supabaseUser.user_metadata.name,
  }
}

async function getMe(req, res) {
  const user = await authService.provisionLocalUser(identityFromToken(req))
  success(res, user)
}

async function provision(req, res) {
  const user = await authService.provisionLocalUser(identityFromToken(req))
  success(res, user, 201)
}

module.exports = { getMe, provision }