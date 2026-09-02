const { Router } = require('express')
const categoryController = require('../controllers/categoryController')

const router = Router()

router.get('/', categoryController.listCategories)
router.get('/:id', categoryController.getCategory)
router.post('/', categoryController.createCategory)
router.put('/:id', categoryController.updateCategory)
router.delete('/:id', categoryController.deleteCategory)

module.exports = router