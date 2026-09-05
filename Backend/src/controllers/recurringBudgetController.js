const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const recurringBudgetService = require('../services/recurringBudgetService')

async function listRecurringBudgets(req, res) {
  const data = await recurringBudgetService.listRecurringBudgets(req.user.id)
  success(res, data)
}

async function getRecurringBudget(req, res) {
  const item = await recurringBudgetService.getRecurringBudget(req.user.id, integer(req.params.id, 'id'))
  success(res, item)
}

async function createRecurringBudget(req, res) {
  const item = await recurringBudgetService.createRecurringBudget(req.user.id, req.body)
  success(res, item, 201)
}

async function updateRecurringBudget(req, res) {
  const item = await recurringBudgetService.updateRecurringBudget(
    req.user.id,
    integer(req.params.id, 'id'),
    req.body,
  )
  success(res, item)
}

async function setActive(req, res) {
  const item = await recurringBudgetService.setActive(
    req.user.id,
    integer(req.params.id, 'id'),
    Boolean(req.body.active),
  )
  success(res, item)
}

async function deleteRecurringBudget(req, res) {
  const result = await recurringBudgetService.deleteRecurringBudget(req.user.id, integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  listRecurringBudgets,
  getRecurringBudget,
  createRecurringBudget,
  updateRecurringBudget,
  setActive,
  deleteRecurringBudget,
}