const { listTransactions } = require('./transactionService')

const PAGE_SIZE = 100

// Export surfaces every matching transaction by paging through the standard list.
async function exportTransactions(query) {
  let page = 1
  let collected = []
  const params = { ...query }
  delete params.page
  delete params.limit

  // eslint-disable-next-line no-constant-condition
  for (;;) {
    const { data, meta } = await listTransactions({ ...params, page, limit: PAGE_SIZE })
    collected = collected.concat(data)
    if (page >= meta.totalPages) break
    page += 1
  }

  return collected.map((tx) => ({
    id: tx.id,
    date: tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : tx.date,
    type: tx.type,
    category: tx.category ? tx.category.name : '',
    account: tx.account ? tx.account.name : '',
    amount: tx.amount,
    note: tx.note || '',
    description: tx.description,
  }))
}

module.exports = { exportTransactions }