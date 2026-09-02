import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { PlusIcon } from '../components/common/Icons'
import CategoryCard from '../components/categories/CategoryCard'
import CategoryForm from '../components/categories/CategoryForm'
import { useToast } from '../context/ToastContext'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categoryApi'

function CategoriesPage() {
  const toast = useToast()

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
        setLoadError(error.message)
        setStatus('error')
      })
  }, [])

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
      toast.success('Category updated.')
    } else {
      await createCategory(payload)
      toast.success('Category added.')
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
      toast.success('Category deleted.')
      setDeleting(null)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Categories"
          subtitle="Organize your transactions by category."
        />
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <PlusIcon />
          Add Category
        </button>
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-24 rounded-box" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div role="alert" className="flex items-center justify-between gap-2 alert alert-error">
          <span>Unable to load categories. {loadError}</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setStatus('loading')
              setRefreshKey((key) => key + 1)
            }}
          >
            Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <EmptyState
            title="No categories available"
            message="Create a category to start organizing your transactions."
            action={
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                Add Category
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {formOpen ? (
        <CategoryForm
          category={editing}
          onCancel={closeForm}
          onSave={handleSave}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete category"
          message={`Delete "${deleting.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          loading={deleteLoading}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  )
}

export default CategoriesPage