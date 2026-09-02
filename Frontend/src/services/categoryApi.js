import { get, post, put, del } from './api'

export function listCategories() {
  return get('/categories')
}

export function createCategory(payload) {
  return post('/categories', payload)
}

export function updateCategory(id, payload) {
  return put(`/categories/${id}`, payload)
}

export function deleteCategory(id) {
  return del(`/categories/${id}`)
}