const { Router } = require('express')
const recurringTransactionController = require('../controllers/recurringTransactionController')

const router = Router()

router.get('/', recurringTransactionController.listRecurringTransactions)
router.get('/:id', recurringTransactionController.getRecurringTransaction)
router.post('/', recurringTransactionController.createRecurringTransaction)
router.put('/:id', recurringTransactionController.updateRecurringTransaction)
router.patch('/:id/active', recurringTransactionController.setActive)
router.delete('/:id', recurringTransactionController.deleteRecurringTransaction)

module.exports = router