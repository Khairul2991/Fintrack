import { EditIcon, TrashIcon } from '../common/Icons'
import { useLanguage } from '../../context/LanguageContext'

function CategoryCard({ category, onEdit, onDelete }) {
  const { t, localizeCategory } = useLanguage()
  const label = localizeCategory(category)
  return (
    <div className="card surface card-border relative overflow-hidden">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <div className="card-body flex-row items-center gap-3 p-4 pl-5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl"
          style={{ backgroundColor: `${category.color}26` }}
          aria-hidden="true"
        >
          {category.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{label}</h3>
          <span
            className="inline-flex items-center gap-1.5 text-xs text-base-content/50"
            title={category.color}
          >
            <span
              className="h-2.5 w-2.5 rounded-full border border-base-300"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            {category.color}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-base-content"
            onClick={() => onEdit(category)}
            aria-label={t('cat.editAria', { name: label })}
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm text-base-content/60 hover:text-error"
            onClick={() => onDelete(category)}
            aria-label={t('cat.deleteAria', { name: label })}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CategoryCard