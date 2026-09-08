import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PlusIcon } from '../components/common/Icons'
import CategoryCard from '../components/categories/CategoryCard'
import CategoryForm from '../components/categories/CategoryForm'
import { isSystemCategory, sortCategoriesForDisplay } from '../l10n/categories'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categoryApi'

function CategoriesPage() {
  const toast = useToast()
  const { t, translateError, localizeCategory } = useLanguage()

  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(() => {
    listCategories()
      .then((response) => {
        setCategories(response.data)
        setLoadError('')
        setStatus('ready')
      })
      .catch((error) => {
        setLoadError(translateError(error.message))
        setStatus('error')
      })
  }, [translateError])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(category) {
    setEditing(category)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  async function handleSave(payload) {
    if (editing) {
      await updateCategory(editing.id, payload)
      toast.success(t('cat.updated'))
    } else {
      await createCategory(payload)
      toast.success(t('cat.added'))
    }
    setFormOpen(false)
    setEditing(null)
    setRefreshKey((key) => key + 1)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteCategory(deleting.id)
      toast.success(t('cat.deleted'))
      setDeleting(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(translateError(error.message))
    } finally {
      setDeleteLoading(false)
    }
  }

  const incomeSystem = sortCategoriesForDisplay(
    categories.filter((category) => category.type === 'INCOME' && isSystemCategory(category)),
    localizeCategory,
  )
  const incomeCustom = sortCategoriesForDisplay(
    categories.filter((category) => category.type === 'INCOME' && !isSystemCategory(category)),
    localizeCategory,
  )
  const expenseSystem = sortCategoriesForDisplay(
    categories.filter((category) => category.type === 'EXPENSE' && isSystemCategory(category)),
    localizeCategory,
  )
  const expenseCustom = sortCategoriesForDisplay(
    categories.filter((category) => category.type === 'EXPENSE' && !isSystemCategory(category)),
    localizeCategory,
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('cat.title')} subtitle={t('cat.subtitle')}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <PlusIcon />
          {t('cat.add')}
        </button>
      </PageHeader>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-24 rounded-box" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="flex items-center justify-between gap-2 alert alert-error">
          <span>{t('cat.loadError')} {loadError}</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setStatus('loading')
              setRefreshKey((key) => key + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="card surface card-border">
          <EmptyState
            title={t('cat.empty')}
            message={t('cat.emptyMsg')}
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                {t('cat.add')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {incomeSystem.length > 0 || incomeCustom.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/50">
                {t('cat.groupIncome')}
              </h2>
              {incomeSystem.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {incomeSystem.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                    />
                  ))}
                </div>
              ) : null}
              {incomeCustom.length > 0 ? (
                <div className="mt-3">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/50">
                    {t('cat.myIncome')}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {incomeCustom.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onEdit={openEdit}
                        onDelete={setDeleting}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
          {expenseSystem.length > 0 || expenseCustom.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/50">
                {t('cat.groupExpense')}
              </h2>
              {expenseSystem.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {expenseSystem.map((category) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      onEdit={openEdit}
                      onDelete={setDeleting}
                    />
                  ))}
                </div>
              ) : null}
              {expenseCustom.length > 0 ? (
                <div className="mt-3">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-content/50">
                    {t('cat.myExpense')}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {expenseCustom.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        onEdit={openEdit}
                        onDelete={setDeleting}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}

      {formOpen ? (
        <CategoryForm category={editing} onCancel={closeForm} onSave={handleSave} />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t('cat.confirmTitle')}
          message={t('cat.confirmMsg', { name: localizeCategory(deleting) })}
          confirmLabel={t('common.delete')}
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default CategoriesPage