'use client'

import { useRef, useState, useEffect } from 'react'
import { Star, MapPin } from 'lucide-react'

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
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

function TestimonialCard({ quote, name, location, delay }: { quote: string; name: string; location: string; delay: number }) {
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
    <div
      ref={ref}
      className="bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col gap-5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms, box-shadow 0.3s, translate 0.3s`,
      }}
    >
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-gray-600 text-[15px] leading-relaxed flex-1">"{quote}"</p>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <div className="w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
          {name[0]}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} /> {location}</p>
        </div>
      </div>
    </div>
  )
}

export function Testimonials() {
  return (
    <section id="reviews" className="py-24 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3">Testimonials</p>
          <h2 className="font-display font-black text-[clamp(32px,5vw,56px)] text-gray-900 tracking-tight">
            Loved by travelers
          </h2>
          <p className="text-gray-500 mt-4 text-lg">Join thousands of happy riders across India</p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          <TestimonialCard
            quote="Saved ₹4,200 on my last 3 trips. The AI pickup suggestions are incredibly accurate!"
            name="Priya Sharma" location="Bangalore" delay={0} />
          <TestimonialCard
            quote="Best carpooling platform I've used. Driver verification gave me complete peace of mind."
            name="Arjun Kumar" location="Kozhikode" delay={150} />
          <TestimonialCard
            quote="As a solo female traveler, the women-only mode and gender composition warnings are game-changers."
            name="Meera Nair" location="Kochi" delay={300} />
        </div>
      </div>
    </section>
  )
}