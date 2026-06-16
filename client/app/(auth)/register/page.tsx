'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Car, Shield, Zap, Star, CheckCircle, ArrowRight } from 'lucide-react'
import { withoutAuth } from '@/components/hoc'
import RegisterForm from '@/components/auth/RegisterForm'

function RegisterPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      
      {/* Floating Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">RideSharePro</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition px-4 py-2">
            Existing account? <span className="font-semibold text-blue-600">Sign in →</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative min-h-screen pt-24 pb-16 flex items-center justify-center overflow-hidden">
        
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

        {/* Dot Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(#2563eb0a 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            
            {/* LEFT PANEL — Brand Section */}
            <div className="space-y-8 sticky top-24">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Join the Community
              </div>

              <h1 className="font-bold text-[clamp(36px,5vw,52px)] text-gray-900 leading-tight tracking-tight">
                Start your<br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">carpooling journey</span>
                <br />today
              </h1>

              <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                Join thousands of smart commuters saving money and reducing carbon emissions every day.
              </p>

              {/* Feature Cards */}
              <div className="space-y-4 pt-4">
                {[
                  { icon: Zap, title: 'Smart AI Matching', desc: 'Instant pickup coordination and route optimization', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { icon: Shield, title: 'Stripe Escrow Payments', desc: 'Secure and automated transfers, zero fraud', color: 'text-green-600', bg: 'bg-green-50' },
                  { icon: Shield, title: '24/7 SOS Support', desc: 'Immediate emergency assistance anywhere', color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition duration-300`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 pt-6 border-t border-gray-100">
                <div className="flex -space-x-2">
                  {['P', 'A', 'M', 'R', 'K'].map((letter, i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-700 border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {letter}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1,284+ joined this month</p>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL — Form */}
            <div className="bg-white rounded-3xl shadow-2xl shadow-blue-200/50 border border-gray-100 p-8">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your details to get started</p>
              </div>
              
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default withoutAuth(RegisterPage)