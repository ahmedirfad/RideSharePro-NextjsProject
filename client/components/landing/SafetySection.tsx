'use client'

import { useRef, useState, useEffect } from 'react'
import { Shield } from 'lucide-react'

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

export function SafetySection() {
  return (
    <section id="safety" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4">Safety First</p>
            <h2 className="font-display font-black text-[clamp(32px,5vw,52px)] text-gray-900 tracking-tight leading-tight mb-6">
              Travel with<br /><span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">total confidence</span>
            </h2>
            <p className="text-gray-500 text-lg mb-10">Every trip is protected end-to-end with industry-leading security measures.</p>
            <div className="space-y-5">
              {[
                { icon: '✓', title: 'Verified Profiles', desc: 'Govt ID verified for all drivers and passengers', color: 'bg-blue-100 text-blue-600' },
                { icon: '🔒', title: 'Stripe Escrow', desc: 'Funds held securely until trip completion', color: 'bg-green-100 text-green-600' },
                { icon: '🆘', title: 'SOS Emergency', desc: 'One-tap location sharing with emergency contacts', color: 'bg-red-100 text-red-600' },
                { icon: '👥', title: 'Gender-Aware Booking', desc: 'Women-only mode & gender composition warnings', color: 'bg-purple-100 text-purple-600' },
              ].map((f, i) => (
                <Reveal key={i} delay={i * 80} className="flex gap-4 group">
                  <div className={`w-11 h-11 rounded-2xl ${f.color} flex items-center justify-center shrink-0 text-base group-hover:scale-110 transition`}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200/50">
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }} />
                <div className="relative z-10">
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                  <div className="text-5xl font-display font-black mb-2">100%</div>
                  <p className="text-xl font-bold mb-1">Payment Protected</p>
                  <p className="text-blue-200 text-sm mb-8">Powered by Stripe · Trusted by 50,000+</p>
                  <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                    {[['0', 'Fraud Cases'], ['2min', 'Response Time'], ['50K+', 'Protected Trips']].map(([val, lbl]) => (
                      <div key={lbl}>
                        <p className="text-2xl font-display font-black">{val}</p>
                        <p className="text-xs text-blue-200 mt-1">{lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-sky-100 rounded-full -z-10" />
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-indigo-100 rounded-full -z-10" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}