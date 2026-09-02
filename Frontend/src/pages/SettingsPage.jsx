import PageHeader from '../components/layout/PageHeader'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../hooks/useTheme'

const THEME_OPTIONS = [
  { value: 'system', label: 'System', description: 'Follows your device appearance.' },
  { value: 'light', label: 'Light', description: 'Always uses the light theme.' },
  { value: 'dark', label: 'Dark', description: 'Always uses the dark theme.' },
]

function SettingsPage() {
  const toast = useToast()
  const [theme, changeTheme] = useTheme()

  function handleThemeChange(value) {
    if (value === theme) return
    changeTheme(value)
    toast.success('Theme updated.')
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Settings" subtitle="Application preferences." />

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Theme</h2>
          <p className="text-sm text-base-content/60">
            Choose how FinTrack looks. The default follows your device.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`btn btn-outline w-full sm:w-40 flex-col items-start gap-0 p-3 h-auto ${
                  theme === option.value ? 'btn-primary' : ''
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  checked={theme === option.value}
                  onChange={() => handleThemeChange(option.value)}
                />
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs font-normal opacity-70">{option.description}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title">Currency</h2>
          <p className="text-sm text-base-content/60">
            FinTrack stores amounts in Indonesian Rupiah (IDR) and formats them consistently
            across all pages.
          </p>
          <p className="text-sm font-semibold tabular-nums">
            Example: Rp1.250.000
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage