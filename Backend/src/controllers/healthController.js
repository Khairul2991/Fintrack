const { success } = require('../utils/apiResponse')

function getHealth(req, res) {
  success(res, { status: 'ok' })
}

module.exports = {
  getHealth,
}