const { Router } = require('express')
const accountController = require('../controllers/accountController')

const router = Router()

router.get('/', accountController.listAccounts)
router.get('/:id', accountController.getAccount)
router.post('/', accountController.createAccount)
router.put('/:id', accountController.updateAccount)
router.delete('/:id', accountController.deleteAccount)

module.exports = router