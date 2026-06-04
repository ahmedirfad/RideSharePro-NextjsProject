'use client'

import Link from 'next/link'
import { Car, Search, Shield, Users, Star, ChevronRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ========== NAVBAR ========== */}
      <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">RideSharePro</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-primary-500 transition">How it Works</a>
              <a href="#safety" className="text-gray-600 hover:text-primary-500 transition">Safety</a>
              <a href="#about" className="text-gray-600 hover:text-primary-500 transition">About</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-gray-700 hover:text-primary-500 transition">
                Sign in
              </Link>
              <Link href="/register" className="px-5 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600 transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-100 rounded-full px-3 py-1 mb-6">
                <Shield className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-medium text-primary-600">Safe & Trusted</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Travel Together,{' '}
                <span className="text-primary-500">Save More</span>
              </h1>
              <p className="text-gray-500 text-lg mt-6 mb-8">
                AI-powered carpooling for intercity trips. Share rides, split costs, and travel safely.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/search" className="px-6 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition inline-flex items-center justify-center gap-2">
                  Find a Ride <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href="/host" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition inline-flex items-center justify-center gap-2">
                  Host a Ride
                </Link>
              </div>
            </div>

            {/* Right - Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-gray-900">50K+</div><div className="text-xs text-gray-500">Happy Riders</div></div>
                <div><div className="text-2xl font-bold text-gray-900">342</div><div className="text-xs text-gray-500">Daily Trips</div></div>
                <div><div className="text-2xl font-bold text-yellow-500">4.8★</div><div className="text-xs text-gray-500">Avg Rating</div></div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {['A', 'P', 'M', 'R'].map((initial, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">{initial}</div>
                  ))}
                </div>
                <span className="text-sm text-gray-500">1,284+ travelers today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500">Simple, safe, and smart — get started in minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: 'Search Rides', desc: 'Enter your route and find drivers going your way', color: 'bg-blue-50', iconColor: 'text-blue-600' },
              { icon: Users, title: 'Get Matched', desc: 'AI matches you with the perfect driver', color: 'bg-green-50', iconColor: 'text-green-600' },
              { icon: Shield, title: 'Pay Safely', desc: 'Stripe escrow protects every payment', color: 'bg-purple-50', iconColor: 'text-purple-600' },
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className={`${step.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition`}>
                  <step.icon className={`${step.iconColor} w-8 h-8`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="bg-primary-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div><div className="text-3xl font-bold">1,284+</div><div className="text-sm opacity-80">Registered Users</div></div>
            <div><div className="text-3xl font-bold">342</div><div className="text-sm opacity-80">Daily Trips</div></div>
            <div><div className="text-3xl font-bold text-yellow-400">4.8★</div><div className="text-sm opacity-80">Avg Rating</div></div>
            <div><div className="text-3xl font-bold">₹84K</div><div className="text-sm opacity-80">Saved Today</div></div>
          </div>
        </div>
      </section>

      {/* ========== SAFETY SECTION ========== */}
      <section id="safety" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Travel with Confidence</h2>
            <p className="text-gray-500">Your safety is our top priority</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { icon: '✓', title: 'Verified Profiles', desc: 'Government ID verified drivers and passengers' },
                { icon: '🔒', title: 'Stripe Escrow', desc: 'Funds held securely until trip completion' },
                { icon: '🆘', title: 'SOS Emergency', desc: 'One-tap location sharing with emergency contacts' },
                { icon: '👥', title: 'Gender-Aware Booking', desc: 'Women-only mode and gender composition warnings' },
              ].map((f, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">{f.icon}</div>
                  <div><h3 className="font-semibold text-gray-900">{f.title}</h3><p className="text-sm text-gray-500">{f.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <Shield className="w-16 h-16 text-primary-500 mx-auto mb-4" />
              <div className="text-3xl font-bold text-green-600 mb-2">0 fraud cases</div>
              <p className="text-gray-600">100% payment protection</p>
              <p className="text-sm text-gray-400 mt-2">Avg response time: 2 min</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Loved by Travelers</h2>
            <p className="text-gray-500">Join thousands of satisfied users</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: 'Saved ₹4,200 on my last 3 trips. The AI pickup suggestions are incredibly accurate!', name: 'Priya Sharma', rating: 5, location: 'Bangalore' },
              { quote: 'Best carpooling platform I\'ve used. The driver verification gave me complete peace of mind.', name: 'Arjun Kumar', rating: 5, location: 'Kozhikode' },
              { quote: 'As a solo female traveler, the women-only mode and gender composition warnings are game-changers.', name: 'Meera Nair', rating: 5, location: 'Kochi' },
            ].map((t, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, j) => (<Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />))}</div>
                <p className="text-gray-700 text-sm italic mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">{t.name[0]}</div>
                  <div><p className="font-medium text-gray-900 text-sm">{t.name}</p><p className="text-xs text-gray-400">{t.location}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="bg-primary-500 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Start Your Journey?</h2>
          <p className="text-white/80 text-lg mb-8">Join thousands of users saving money and reducing carbon emissions</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/search" className="px-6 py-3 bg-white text-primary-600 rounded-full font-semibold hover:bg-gray-100 transition">Find a Ride</Link>
            <Link href="/host" className="px-6 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition">Host a Ride</Link>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div><div className="flex items-center gap-2 mb-4"><Car className="w-5 h-5 text-primary-400" /><span className="font-bold text-lg">RideSharePro</span></div><p className="text-gray-400 text-sm">Making intercity travel affordable and sustainable</p></div>
            <div><h4 className="font-semibold mb-4">Product</h4><ul className="space-y-2 text-sm text-gray-400"><li><a href="#how-it-works" className="hover:text-white transition">How it Works</a></li><li><a href="#safety" className="hover:text-white transition">Safety</a></li></ul></div>
            <div><h4 className="font-semibold mb-4">Company</h4><ul className="space-y-2 text-sm text-gray-400"><li><a href="#" className="hover:text-white transition">About</a></li><li><a href="#" className="hover:text-white transition">Blog</a></li></ul></div>
            <div><h4 className="font-semibold mb-4">Support</h4><ul className="space-y-2 text-sm text-gray-400"><li><a href="#" className="hover:text-white transition">Help Center</a></li><li><a href="#" className="hover:text-white transition">Contact</a></li><li><a href="#" className="hover:text-white transition">Privacy Policy</a></li></ul></div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-gray-500 text-xs">© 2025 RideSharePro. All rights reserved.</div>
        </div>
      </footer>

    </div>
  )
}