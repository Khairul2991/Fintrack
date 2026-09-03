import { get, post, patch } from './api'

export function listNotifications() {
  return get('/notifications')
}

export function generateNotifications() {
  return post('/notifications/generate')
}

export function markNotificationRead(id) {
  return patch(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return post('/notifications/read-all')
}