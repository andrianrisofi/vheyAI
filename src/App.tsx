import { useEffect, useRef } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import Navbar from './components/Navbar.tsx'
import UserStats from './components/UserStats.tsx'
import HeroSection from './components/HeroSection.tsx'
import HowItWorks from './components/HowItWorks.tsx'
import GeneratorSection from './components/GeneratorSection.tsx'
import GallerySection from './components/GallerySection.tsx'
import UserDoodles from './components/UserDoodles.tsx'
import FAQSection from './components/FAQSection.tsx'
import Footer from './components/Footer.tsx'
import ProofPage from './components/ProofPage.tsx'
import './App.css'

function App() {
  const { connected } = useWallet()
  const hasConnectedInApp = useRef(false)
  const isAppPage = window.location.pathname === '/app'
  const isProofPage = window.location.pathname.startsWith('/proof/')

  useEffect(() => {
    if (!isAppPage) return

    if (connected) {
      hasConnectedInApp.current = true
      return
    }

    if (hasConnectedInApp.current) {
      window.location.assign('/')
    }
  }, [connected, isAppPage])

  if (isAppPage) {
    return (
      <div className="app-root">
        <Navbar page="app" />
        <UserStats />
        <main className="app-shell">
          <section className="app-intro">
            <div>
              <div className="section-label">Vhey Studio</div>
              <h1 className="font-display">Generate, store, and manage Shelby refractions.</h1>
            </div>
          </section>
          <GeneratorSection />
          <UserDoodles />
        </main>
        <Footer page="app" />
      </div>
    )
  }

  if (isProofPage) {
    return (
      <div className="app-root">
        <Navbar page="landing" />
        <ProofPage />
        <Footer page="landing" />
      </div>
    )
  }

  return (
    <div className="app-root">
      <Navbar page="landing" />
      <main>
        <HeroSection />
        <HowItWorks />
        <GallerySection />
        <FAQSection />
      </main>
      <Footer page="landing" />
    </div>
  )
}

export default App
