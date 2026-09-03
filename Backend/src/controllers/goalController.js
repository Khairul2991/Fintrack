const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const goalService = require('../services/goalService')

async function listGoals(req, res) {
  const goals = await goalService.listGoals()
  success(res, goals)
}

async function getGoal(req, res) {
  const goal = await goalService.getGoal(integer(req.params.id, 'id'))
  success(res, goal)
}

async function createGoal(req, res) {
  const goal = await goalService.createGoal(req.body)
  success(res, goal, 201)
}

async function updateGoal(req, res) {
  const goal = await goalService.updateGoal(integer(req.params.id, 'id'), req.body)
  success(res, goal)
}

async function updateGoalProgress(req, res) {
  const goal = await goalService.updateGoalProgress(integer(req.params.id, 'id'), req.body.currentAmount)
  success(res, goal)
}

async function deleteGoal(req, res) {
  const result = await goalService.deleteGoal(integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
}