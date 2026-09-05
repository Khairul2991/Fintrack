const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const notificationService = require('../services/notificationService')

async function generate(req, res) {
  const result = await notificationService.generateNotifications(req.user.id)
  success(res, result)
}

async function listNotifications(req, res) {
  const { items, unread } = await notificationService.listNotifications(req.user.id)
  success(res, { items, unread })
}

async function markRead(req, res) {
  const result = await notificationService.markRead(req.user.id, integer(req.params.id, 'id'))
  success(res, result)
}

async function markAllRead(req, res) {
  const result = await notificationService.markAllRead(req.user.id)
  success(res, result)
}

module.exports = {
  generate,
  listNotifications,
  markRead,
  markAllRead,
}