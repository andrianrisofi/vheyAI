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
  return (
    <div className="app-root">
      <Navbar />
      <UserStats />
      <main>
        <HeroSection />
        <HowItWorks />
        <GeneratorSection />
        <GallerySection />
        <UserDoodles />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
