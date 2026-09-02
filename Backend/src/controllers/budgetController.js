const { success, successList } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const budgetService = require('../services/budgetService')

async function listBudgets(req, res) {
  successList(res, await budgetService.listBudgets(req.query))
}

async function getBudget(req, res) {
  const budget = await budgetService.getBudget(integer(req.params.id, 'id'))
  success(res, budget)
}

async function createBudget(req, res) {
  const budget = await budgetService.createBudget(req.body)
  success(res, budget, 201)
}

async function updateBudget(req, res) {
  const budget = await budgetService.updateBudget(integer(req.params.id, 'id'), req.body)
  success(res, budget)
}

async function deleteBudget(req, res) {
  const result = await budgetService.deleteBudget(integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  listBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
}