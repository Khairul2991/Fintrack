import { useEffect, useState } from 'react'

const SURFACE_SELECTORS = ['#features', '#budgets-goals', '#contact', 'footer']

// Opaque white section surfaces rendered on `.surface-plane` (z-5), i.e.
// below the global orbs (z-20) and above the page background, while all
// section content stays in `.content-plane` at z-30 (above the orbs).
// Strip geometry is measured from the live section boxes so the white
// surfaces keep exactly matching their sections as layout settles.
function SectionSurfaces() {
  const [strips, setStrips] = useState(null)

  useEffect(() => {
    let raf = 0
    const measure = () => {
      const next = SURFACE_SELECTORS.map((selector) => {
        const el = document.querySelector(selector)
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return {
          key: selector,
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height),
        }
      }).filter(Boolean)
      setStrips((prev) =>
        prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      )
    }
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    measure()
    const elements = SURFACE_SELECTORS.map((s) => document.querySelector(s)).filter(Boolean)
    const observer = new ResizeObserver(schedule)
    elements.forEach((el) => observer.observe(el))
    window.addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule).catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])

  if (!strips) return null

  return (
    <div aria-hidden="true" className="surface-plane">
      {strips.map((strip) => (
        <div
          key={strip.key}
          className="surface-strip absolute left-0 right-0 bg-base-100"
          style={{ top: strip.top, height: strip.height }}
        />
      ))}
    </div>
  )
}

export default SectionSurfaces