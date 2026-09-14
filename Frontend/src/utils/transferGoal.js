export function resolveTransferSourceGoal({ amount, available, goals = [] }) {
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) return null
  const funded = goals.filter((goal) => Number(goal.currentAmount) > 0)
  if (funded.length === 0) return null
  const allocation = funded.reduce((sum, goal) => sum + Number(goal.currentAmount), 0)
  const unallocated = Number(available) - allocation
  const shortfall = Math.max(0, num - unallocated)
  if (shortfall === 0) return null
  if (funded.length !== 1) return { ambiguous: true, unallocated, shortfall }
  const goal = funded[0]
  return { goal, withdrawal: Math.min(shortfall, Number(goal.currentAmount)), unallocated, shortfall }
}