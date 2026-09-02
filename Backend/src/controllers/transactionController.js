const { success, successList } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const transactionService = require('../services/transactionService')

async function listTransactions(req, res) {
  const { data, meta } = await transactionService.listTransactions(req.query)
  successList(res, data, meta)
}

async function getTransaction(req, res) {
  const transaction = await transactionService.getTransaction(integer(req.params.id, 'id'))
  success(res, transaction)
}

async function createTransaction(req, res) {
  const transaction = await transactionService.createTransaction(req.body)
  success(res, transaction, 201)
}

async function updateTransaction(req, res) {
  const transaction = await transactionService.updateTransaction(integer(req.params.id, 'id'), req.body)
  success(res, transaction)
}

async function deleteTransaction(req, res) {
  const result = await transactionService.deleteTransaction(integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
}