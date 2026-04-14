import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Story from '../components/Story'
import Features from '../components/Features'
import Models from '../components/Models'
import Pricing from '../components/Pricing'
import Comparison from '../components/Comparison'
import CTASection from '../components/CTASection'
import Footer from '../components/Footer'
import TrialModal from '../components/TrialModal'
import { useState } from 'react'

export default function Home() {
  const [showTrial, setShowTrial] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <Navbar onRequestDemo={() => setShowTrial(true)} />
      <Hero onRequestDemo={() => setShowTrial(true)} />
      <Story />
      <Features />
      <Models />
      <Pricing onRequestDemo={() => setShowTrial(true)} />
      <Comparison />
      <CTASection onRequestDemo={() => setShowTrial(true)} />
      <Footer />
      {showTrial && <TrialModal onClose={() => setShowTrial(false)} />}
    </div>
  )
}
