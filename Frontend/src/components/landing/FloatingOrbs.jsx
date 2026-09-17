// Global, page-wide decorative orb layer.
// Positions are relative to the whole landing page (each section is
// roughly one viewport tall, so percentages map to section belts).
export const LANDING_ORBS = [
  // Hero (strongest)
  { size: 460, top: '4%', left: '7%', opacity: 0.4, duration: 24, delay: -5 },
  { size: 360, top: '7%', right: '3%', tone: 'info', opacity: 0.45, duration: 27, delay: -12, className: 'hidden md:block' },
  { size: 540, top: '14%', left: '24%', opacity: 0.42, duration: 29, delay: -9 },
  // Why FinTrack
  { size: 300, top: '19%', right: '9%', tone: 'info', opacity: 0.4, duration: 22, delay: -2 },
  // Why -> Features transition
  { size: 240, top: '27%', left: '5%', opacity: 0.48, duration: 19, delay: -7 },
  // Features
  { size: 380, top: '32%', right: '12%', opacity: 0.45, duration: 26, delay: -14, className: 'hidden md:block' },
  // How It Works
  { size: 340, top: '42%', left: '14%', tone: 'info', opacity: 0.4, duration: 25, delay: -8 },
  { size: 190, top: '47%', right: '26%', opacity: 0.45, duration: 17, delay: -3 },
  // Budget & Goals
  { size: 360, top: '54%', right: '6%', opacity: 0.4, duration: 26, delay: -4 },
  { size: 280, top: '57%', left: '10%', tone: 'info', opacity: 0.42, duration: 23, delay: -12 },
  // Reports
  { size: 400, top: '66%', left: '22%', tone: 'info', opacity: 0.4, duration: 24, delay: -2 },
  { size: 240, top: '69%', right: '7%', opacity: 0.4, duration: 20, delay: -10, className: 'hidden md:block' },
  // Contact
  { size: 320, top: '76%', left: '8%', opacity: 0.45, duration: 22, delay: -6 },
  { size: 260, top: '81%', right: '6%', tone: 'info', opacity: 0.4, duration: 24, delay: -11, className: 'hidden md:block' },
  // FinalCta -> Footer transitions (bubbles cross the footer band)
  { size: 340, top: '88%', left: '16%', tone: 'info', opacity: 0.4, duration: 24, delay: -4 },
  { size: 300, top: '94%', right: '10%', opacity: 0.45, duration: 26, delay: -9 },
  { size: 240, top: '97.5%', left: '44%', opacity: 0.4, duration: 20, delay: -3, className: 'hidden md:block' },
]

function FloatingOrbs({ spots = LANDING_ORBS }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {spots.map((spot, index) => (
        <span
          key={index}
          className={`fintrack-orb fintrack-orb-${spot.tone ?? 'primary'} ${spot.className ?? ''}`}
          style={{
            width: spot.size,
            height: spot.size,
            top: spot.top,
            bottom: spot.bottom,
            left: spot.left,
            right: spot.right,
            opacity: spot.opacity ?? 0.55,
            '--float-dur': `${spot.duration ?? 22}s`,
            '--float-delay': `${spot.delay ?? 0}s`,
            '--float-x': spot.x ?? '2rem',
            '--float-y': spot.y ?? '-2.5rem',
          }}
        />
      ))}
    </div>
  )
}

export default FloatingOrbs