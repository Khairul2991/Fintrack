const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const recurringTransactionService = require('../services/recurringTransactionService')

async function listRecurringTransactions(req, res) {
  const { data, catchUp } = await recurringTransactionService.listRecurringTransactions()
  success(res, { items: data, catchUp })
}

async function getRecurringTransaction(req, res) {
  const item = await recurringTransactionService.getRecurringTransaction(integer(req.params.id, 'id'))
  success(res, item)
}

async function createRecurringTransaction(req, res) {
  const item = await recurringTransactionService.createRecurringTransaction(req.body)
  success(res, item, 201)
}

async function updateRecurringTransaction(req, res) {
  const item = await recurringTransactionService.updateRecurringTransaction(
    integer(req.params.id, 'id'),
    req.body,
  )
  success(res, item)
}

async function setActive(req, res) {
  const item = await recurringTransactionService.setActive(
    integer(req.params.id, 'id'),
    Boolean(req.body.active),
  )
  success(res, item)
}

async function deleteRecurringTransaction(req, res) {
  const result = await recurringTransactionService.deleteRecurringTransaction(
    integer(req.params.id, 'id'),
  )
  success(res, result)
}

module.exports = {
  listRecurringTransactions,
  getRecurringTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  setActive,
  deleteRecurringTransaction,
}