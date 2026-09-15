import { del } from './api'

export function resetMyData() {
  return del('/users/me/data')
}
