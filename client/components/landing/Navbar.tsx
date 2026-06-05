'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Car, Menu, X } from 'lucide-react'

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-800 text-xl text-gray-900 tracking-tight">RideSharePro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {['How it Works', 'Safety', 'Reviews'].map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/\s/g, '-')}`} className="text-sm font-medium text-gray-500 hover:text-blue-600 transition relative group">
              {label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition px-4 py-2">Sign in</Link>
          <Link href="/register" className="text-sm font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-200/60 hover:-translate-y-0.5">
            Get Started
          </Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-xl text-gray-700">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-6 space-y-4 shadow-xl">
          {['How it Works', 'Safety', 'Reviews'].map((label) => (
            <a key={label} href={`#${label.toLowerCase().replace(/\s/g, '-')}`} onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium py-2">
              {label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="flex-1 text-center py-2.5 border border-gray-200 rounded-full text-sm font-medium">Sign in</Link>
            <Link href="/register" className="flex-1 text-center py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  )
}