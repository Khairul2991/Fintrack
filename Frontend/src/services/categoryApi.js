import { get } from './api'

export function listCategories() {
  return get('/categories')
}