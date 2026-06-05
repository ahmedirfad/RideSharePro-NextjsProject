'use client'

import { useRef, useState, useEffect } from 'react'
import { Search, Zap, Shield } from 'lucide-react'

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3">Process</p>
          <h2 className="font-display font-black text-[clamp(32px,5vw,56px)] text-gray-900 tracking-tight">
            Ready in 3 steps
          </h2>
          <p className="text-gray-500 mt-4 text-lg max-w-md mx-auto">Simple, safe, and smart — start your journey in minutes.</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-14 left-1/6 right-1/6 h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

          {[
            { icon: Search, step: '01', title: 'Search Rides', desc: 'Enter your route and date. Our AI instantly finds drivers heading your way.', color: 'from-blue-500 to-blue-600' },
            { icon: Zap, step: '02', title: 'Get AI Matched', desc: 'Smart matching considers route, timing, gender preferences, and ratings.', color: 'from-sky-500 to-cyan-500' },
            { icon: Shield, step: '03', title: 'Pay Securely', desc: 'Stripe escrow holds your payment until trip completion. Zero fraud guaranteed.', color: 'from-indigo-500 to-blue-600' },
          ].map(({ icon: Icon, step, title, desc, color }, i) => (
            <Reveal key={i} delay={i * 150} className="step-card relative text-center group cursor-default">
              <div className="relative inline-block mb-6">
                <div className={`step-icon w-24 h-24 rounded-3xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto shadow-xl`}
                  style={{ boxShadow: `0 20px 60px ${i === 0 ? '#2563eb33' : i === 1 ? '#0ea5e933' : '#6366f133'}` }}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-gray-100 text-gray-400 text-xs font-black flex items-center justify-center shadow-sm">
                  {step}
                </span>
              </div>
              <h3 className="font-display font-bold text-2xl text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-500 leading-relaxed">{desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}