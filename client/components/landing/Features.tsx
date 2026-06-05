'use client'

import { useRef, useState, useEffect } from 'react'
import { MapPin, Shield, Star, CheckCircle, ChevronRight } from 'lucide-react'

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

export function Features() {
  return (
    <section className="py-24 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3">Features</p>
          <h2 className="font-display font-black text-[clamp(32px,5vw,56px)] text-gray-900 tracking-tight">
            Everything you need
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Big card */}
          <Reveal delay={0} className="md:col-span-2 feature-card bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                <MapPin size={22} className="text-white" />
              </div>
              <h3 className="font-display font-bold text-2xl mb-2">AI Pickup Suggestions</h3>
              <p className="text-blue-100 text-sm leading-relaxed max-w-sm">
                Our AI analyses traffic, rider locations, and route efficiency to suggest the perfect pickup point — saving time for everyone.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white cursor-pointer group">
                Learn more <ChevronRight size={14} className="group-hover:translate-x-1 transition" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="feature-card bg-white border border-gray-100 rounded-3xl p-7 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-5">
              <Shield size={22} className="text-green-600" />
            </div>
            <h3 className="font-display font-bold text-xl text-gray-900 mb-2">Stripe Escrow</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Funds held safely until trip completion. Zero fraud, ever.</p>
            <div className="mt-5 text-2xl font-black text-green-600">0 fraud cases</div>
          </Reveal>

          <Reveal delay={150} className="feature-card bg-white border border-gray-100 rounded-3xl p-7 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-5">
              <Star size={22} className="text-amber-600" />
            </div>
            <h3 className="font-display font-bold text-xl text-gray-900 mb-2">ID Verified Drivers</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Every driver passes government ID verification before their first trip.</p>
            <div className="mt-5 flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
              <span className="text-sm font-bold text-gray-700 ml-1">4.8 avg</span>
            </div>
          </Reveal>

          <Reveal delay={200} className="md:col-span-2 feature-card bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(#60a5fa 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="relative z-10 grid grid-cols-2 gap-8 items-center">
              <div>
                <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mb-5 border border-red-500/30">
                  <span className="text-xl">🆘</span>
                </div>
                <h3 className="font-display font-bold text-2xl mb-2">SOS Emergency</h3>
                <p className="text-gray-400 text-sm leading-relaxed">One tap shares your live GPS with emergency contacts and local authorities instantly.</p>
              </div>
              <div className="flex flex-col gap-3">
                {['Live GPS sharing', 'Emergency contacts', 'Local authorities', '24/7 response'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <CheckCircle size={14} className="text-green-400 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}