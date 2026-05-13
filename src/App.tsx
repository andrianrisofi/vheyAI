import Navbar from './components/Navbar.tsx'
import UserStats from './components/UserStats.tsx'
import HeroSection from './components/HeroSection.tsx'
import HowItWorks from './components/HowItWorks.tsx'
import GeneratorSection from './components/GeneratorSection.tsx'
import GallerySection from './components/GallerySection.tsx'
import UserDoodles from './components/UserDoodles.tsx'
import FAQSection from './components/FAQSection.tsx'
import Footer from './components/Footer.tsx'
import './App.css'

function App() {
  const isAppPage = window.location.pathname === '/app'

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
            <a href="/" className="btn btn-secondary">Back to Landing</a>
          </section>
          <GeneratorSection />
          <UserDoodles />
        </main>
        <Footer page="app" />
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
