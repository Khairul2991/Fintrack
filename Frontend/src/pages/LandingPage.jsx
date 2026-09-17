import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import LandingSections from '../components/landing/LandingSections'
import ContactSection from '../components/landing/ContactSection'
import LandingFooter from '../components/landing/LandingFooter'
import FloatingOrbs from '../components/landing/FloatingOrbs'
import SectionSurfaces from '../components/landing/SectionSurfaces'

function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip overflow-y-clip bg-base-200 text-base-content">
      <SectionSurfaces />
      <FloatingOrbs />
      <LandingNavbar />
      <div className="content-plane">
        <main id="main">
          <HeroSection />
          <LandingSections />
          <ContactSection />
        </main>
        <LandingFooter />
      </div>
    </div>
  )
}

export default LandingPage
