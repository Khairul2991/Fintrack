const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const goalService = require('../services/goalService')
const { listCategories } = require('../services/categoryService')
const { listAccounts } = require('../services/accountService')

async function getGoalsOverview(req, res) {
  const userId = req.user.id
  const [goals, categories, accounts] = await Promise.all([
    goalService.listGoals(userId),
    listCategories(userId),
    listAccounts(userId),
  ])
  success(res, { goals, categories, accounts })
}

async function listGoals(req, res) {
  const goals = await goalService.listGoals(req.user.id)
  success(res, goals)
}

async function getGoal(req, res) {
  const goal = await goalService.getGoal(req.user.id, integer(req.params.id, 'id'))
  success(res, goal)
}

async function createGoal(req, res) {
  const goal = await goalService.createGoal(req.user.id, req.body)
  success(res, goal, 201)
}

async function updateGoal(req, res) {
  const goal = await goalService.updateGoal(req.user.id, integer(req.params.id, 'id'), req.body)
  success(res, goal)
}

async function deleteGoal(req, res) {
  const result = await goalService.deleteGoal(req.user.id, integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  getGoalsOverview,
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
}