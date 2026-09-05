const { success, successList } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const categoryService = require('../services/categoryService')

async function listCategories(req, res) {
  successList(res, await categoryService.listCategories(req.user.id))
}

async function getCategory(req, res) {
  const category = await categoryService.getCategory(req.user.id, integer(req.params.id, 'id'))
  success(res, category)
}

async function createCategory(req, res) {
  const category = await categoryService.createCategory(req.user.id, req.body)
  success(res, category, 201)
}

async function updateCategory(req, res) {
  const category = await categoryService.updateCategory(req.user.id, integer(req.params.id, 'id'), req.body)
  success(res, category)
}

async function deleteCategory(req, res) {
  const result = await categoryService.deleteCategory(req.user.id, integer(req.params.id, 'id'))
  success(res, result)
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
}