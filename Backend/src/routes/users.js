const { Router } = require('express')
const userController = require('../controllers/userController')

const router = Router()

router.delete('/me/data', userController.resetMyData)

module.exports = router
