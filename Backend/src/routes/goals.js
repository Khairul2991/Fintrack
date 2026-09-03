const { Router } = require('express')
const goalController = require('../controllers/goalController')

const router = Router()

router.get('/', goalController.listGoals)
router.get('/:id', goalController.getGoal)
router.post('/', goalController.createGoal)
router.put('/:id', goalController.updateGoal)
router.patch('/:id/progress', goalController.updateGoalProgress)
router.delete('/:id', goalController.deleteGoal)

module.exports = router