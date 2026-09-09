const { Router } = require('express')
const goalController = require('../controllers/goalController')

const router = Router()

router.get('/', goalController.listGoals)
router.get('/overview', goalController.getGoalsOverview)
router.get('/:id', goalController.getGoal)
router.post('/', goalController.createGoal)
router.put('/:id', goalController.updateGoal)
router.delete('/:id', goalController.deleteGoal)

module.exports = router