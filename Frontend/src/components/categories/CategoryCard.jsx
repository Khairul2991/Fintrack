import { EditIcon, TrashIcon } from '../common/Icons'

function CategoryCard({ category, onEdit, onDelete }) {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body flex-row items-center gap-3 p-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ backgroundColor: `${category.color}26` }}
          aria-hidden="true"
        >
          {category.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{category.name}</h3>
          <p className="font-mono text-xs text-base-content/50">{category.color}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm hover:text-error"
            onClick={() => onDelete(category)}
            aria-label={`Delete ${category.name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CategoryCard