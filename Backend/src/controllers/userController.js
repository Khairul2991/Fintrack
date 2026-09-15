const { success } = require('../utils/apiResponse')
const userDataService = require('../services/userDataService')

async function resetMyData(req, res) {
  const result = await userDataService.resetAllUserData(req.user.id)
  success(res, result)
}

module.exports = {
  resetMyData,
}
