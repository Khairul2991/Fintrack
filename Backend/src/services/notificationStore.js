// Notification persistence shared by notificationService and the recurring
// catch-up path. Kept in its own module so runCatchUp can create the due
// reminder at the exact moment it advances nextOccurrence without importing
// notificationService (which would create a circular dependency).

async function hasUnreadOf(prisma, userId, type, message) {
  const existing = await prisma.notification.findFirst({
    where: { type, message, read: false, userId },
    select: { id: true },
  })
  return Boolean(existing)
}

// Returns 1 when a notification row was created, 0 when an identical unread
// notification already exists (dedup so repeated generation never stacks
// duplicates of the same reminder).
async function createNotification(prisma, userId, type, title, message) {
  if (await hasUnreadOf(prisma, userId, type, message)) {
    return 0
  }
  await prisma.notification.create({ data: { userId, type, title, message } })
  return 1
}

module.exports = { hasUnreadOf, createNotification }