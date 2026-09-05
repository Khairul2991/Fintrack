const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const accountService = require('../services/accountService')

async function listAccounts(req, res) {
  const accounts = await accountService.listAccounts(req.user.id)
  success(res, accounts)
}

async function getAccount(req, res) {
  const account = await accountService.getAccount(req.user.id, integer(req.params.id, 'id'))
  success(res, account)
}

async function createAccount(req, res) {
  const account = await accountService.createAccount(req.user.id, req.body)
  success(res, account, 201)
}

async function updateAccount(req, res) {
  const account = await accountService.updateAccount(req.user.id, integer(req.params.id, 'id'), req.body)
  success(res, account)
}

async function deleteAccount(req, res) {
  const result = await accountService.deleteAccount(req.user.id, integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
}