const { Router } = require('express')
const transactionController = require('../controllers/transactionController')

const router = Router()

router.get('/', transactionController.listTransactions)
router.get('/:id', transactionController.getTransaction)
router.post('/', transactionController.createTransaction)
router.put('/:id', transactionController.updateTransaction)
router.delete('/:id', transactionController.deleteTransaction)

module.exports = router