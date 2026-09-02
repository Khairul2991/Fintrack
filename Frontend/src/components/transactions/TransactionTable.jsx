import { formatCurrency, formatDate } from '../../utils/format'

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487zM19.5 8.25l.75.75"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  )
}

function TransactionTable({ transactions, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Type</th>
            <th className="text-right">Amount</th>
            <th className="text-right w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover">
              <td className="whitespace-nowrap text-sm">{formatDate(transaction.date)}</td>
              <td className="text-sm">{transaction.category.name}</td>
              <td>
                <div className="font-medium text-sm">{transaction.description}</div>
                {transaction.note ? (
                  <div className="text-xs text-base-content/50">{transaction.note}</div>
                ) : null}
              </td>
              <td>
                <span
                  className={`badge badge-sm ${
                    transaction.type === 'INCOME' ? 'badge-success' : 'badge-error'
                  }`}
                >
                  {transaction.type === 'INCOME' ? 'Income' : 'Expense'}
                </span>
              </td>
              <td
                className={`whitespace-nowrap text-right font-semibold ${
                  transaction.type === 'INCOME' ? 'text-success' : 'text-error'
                }`}
              >
                {formatCurrency(transaction.amount)}
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-square btn-sm"
                    onClick={() => onEdit(transaction)}
                    aria-label={`Edit ${transaction.description}`}
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-square btn-sm hover:text-error"
                    onClick={() => onDelete(transaction)}
                    aria-label={`Delete ${transaction.description}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TransactionTable