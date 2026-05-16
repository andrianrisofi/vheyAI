import { useEffect, useRef, useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import Navbar from './components/Navbar.tsx'
import UserStats from './components/UserStats.tsx'
import HeroSection from './components/HeroSection.tsx'
import HowItWorks from './components/HowItWorks.tsx'
import GeneratorSection from './components/GeneratorSection.tsx'
import GallerySection from './components/GallerySection.tsx'
import UserDoodles from './components/UserDoodles.tsx'
import MarketplaceSection from './components/MarketplaceSection.tsx'
import FAQSection from './components/FAQSection.tsx'
import Footer from './components/Footer.tsx'
import ProofPage from './components/ProofPage.tsx'
import './App.css'

export type AppView = 'studio' | 'refractions' | 'market'

function App() {
  const { connected } = useWallet()
  const hasConnectedInApp = useRef(false)
  const [appView, setAppView] = useState<AppView>('studio')
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

  useEffect(() => {
    if (!connected && appView !== 'studio') {
      setAppView('studio')
    }
  }, [appView, connected])

  const appViewMeta = {
    studio: {
      label: 'Vhey Studio',
      title: 'Generate and store Shelby refractions.',
    },
    refractions: {
      label: 'My Refractions',
      title: 'Manage your saved Shelby refractions.',
    },
    market: {
      label: 'Marketplace',
      title: 'List and discover refraction NFTs.',
    },
  } satisfies Record<AppView, { label: string; title: string }>

  if (isAppPage) {
    return (
      <div className="app-root">
        <Navbar page="app" appView={appView} onAppViewChange={setAppView} />
        <UserStats />
        <main className="app-shell">
          {appView !== 'market' && (
            <section className="app-intro">
              <div>
                <div className="section-label">{appViewMeta[appView].label}</div>
                <h1 className="font-display">{appViewMeta[appView].title}</h1>
              </div>
            </section>
          )}
          {appView === 'studio' && <GeneratorSection />}
          {appView === 'refractions' && <UserDoodles />}
          {appView === 'market' && <MarketplaceSection />}
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
