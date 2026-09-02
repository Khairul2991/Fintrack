const { Router } = require('express')
const budgetController = require('../controllers/budgetController')

const router = Router()

router.get('/', budgetController.listBudgets)
router.get('/:id', budgetController.getBudget)
router.post('/', budgetController.createBudget)
router.put('/:id', budgetController.updateBudget)
router.delete('/:id', budgetController.deleteBudget)

module.exports = router