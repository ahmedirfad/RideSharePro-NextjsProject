'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'

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

export function CTASection() {
  return (
    <section className="py-24 px-5 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-[2.5rem] p-14 text-center text-white overflow-hidden shadow-2xl shadow-blue-300/40">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2" />

            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-4">Get Started Today</p>
              <h2 className="font-display font-black text-[clamp(28px,5vw,52px)] text-white tracking-tight leading-tight mb-4">
                Ready to Start<br />Your Journey?
              </h2>
              <p className="text-blue-100 text-lg mb-10 max-w-md mx-auto">
                Join thousands saving money and reducing carbon emissions every day.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/search" className="px-8 py-4 bg-white text-blue-700 rounded-full font-bold hover:bg-blue-50 transition shadow-xl text-sm">
                  Find a Ride →
                </Link>
                <Link href="/host" className="px-8 py-4 border-2 border-white/40 text-white rounded-full font-bold hover:bg-white/10 transition text-sm">
                  Host a Ride
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}