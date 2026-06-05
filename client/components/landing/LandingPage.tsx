'use client'

import { Navbar } from './Navbar'
import { HeroSection } from './HeroSection'
import { HowItWorks } from './HowItWorks'
import { Features } from './Features'
import { SafetySection } from './SafetySection'
import { Testimonials } from './Testimonials'
import { CTASection } from './CTASection'
import { Footer } from './Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <Features />
      <SafetySection />
      <Testimonials />
      <CTASection />
      <Footer />
    </div>
  )
}