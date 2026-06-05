import Link from 'next/link'
import { Car } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-xl">RideSharePro</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Making intercity travel affordable, safe, and sustainable with AI-powered carpooling.
            </p>
            <div className="flex gap-3 mt-6">
              {['📱 iOS', '🤖 Android'].map(l => (
                <button key={l} className="text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl transition">
                  {l}
                </button>
              ))}
            </div>
          </div>

          {[
            { title: 'Product', links: ['How it Works', 'Safety', 'Pricing'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers'] },
            { title: 'Support', links: ['Help Center', 'Contact', 'Privacy'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="font-bold text-sm mb-4 text-white">{title}</h4>
              <ul className="space-y-2.5">
                {links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <span>© 2026 RideSharePro. All rights reserved.</span>
          <span className="flex items-center gap-1">Made with <span className="text-red-400">♥</span> for safe travel</span>
        </div>
      </div>
    </footer>
  )
}