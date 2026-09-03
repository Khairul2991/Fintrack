const { success } = require('../utils/apiResponse')
const { integer } = require('../utils/validate')
const notificationService = require('../services/notificationService')

async function generate(req, res) {
  const result = await notificationService.generateNotifications()
  success(res, result)
}

async function listNotifications(req, res) {
  const { items, unread } = await notificationService.listNotifications()
  success(res, { items, unread })
}

async function markRead(req, res) {
  const result = await notificationService.markRead(integer(req.params.id, 'id'))
  success(res, result)
}

async function markAllRead(req, res) {
  const result = await notificationService.markAllRead()
  success(res, result)
}

module.exports = {
  generate,
  listNotifications,
  markRead,
  markAllRead,
}