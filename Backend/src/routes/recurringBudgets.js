const { Router } = require('express')
const recurringBudgetController = require('../controllers/recurringBudgetController')

const router = Router()

router.get('/', recurringBudgetController.listRecurringBudgets)
router.get('/:id', recurringBudgetController.getRecurringBudget)
router.post('/', recurringBudgetController.createRecurringBudget)
router.put('/:id', recurringBudgetController.updateRecurringBudget)
router.patch('/:id/active', recurringBudgetController.setActive)
router.delete('/:id', recurringBudgetController.deleteRecurringBudget)

module.exports = router