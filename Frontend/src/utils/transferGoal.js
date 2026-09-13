export function resolveTransferSourceGoal({ amount, available, goals = [] }) {
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) return null
  const funded = goals.filter((goal) => Number(goal.currentAmount) > 0)
  if (funded.length === 0) return null
  const allocation = funded.reduce((sum, goal) => sum + Number(goal.currentAmount), 0)
  const after = Number(available) - num
  if (allocation <= after) return null
  if (funded.length !== 1) return { ambiguous: true }
  const goal = funded[0]
  return { goal, withdrawal: Math.min(num, Number(goal.currentAmount)) }
}