export function accountDisplayName(account, t) {
  if (!account) return ''
  return account.isDefault ? t('acc.typeCash') : account.name
}

function numericBalance(account) {
  const value = Number(account && account.balance)
  return Number.isFinite(value) ? value : -Infinity
}

export function sortAccountsDefaultFirst(accounts) {
  if (!accounts) return []
  const defaults = accounts.filter((account) => account.isDefault)
  const rest = accounts.filter((account) => !account.isDefault)
  rest.sort((a, b) => numericBalance(b) - numericBalance(a))
  return defaults.concat(rest)
}