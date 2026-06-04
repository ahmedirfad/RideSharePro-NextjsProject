import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Sign In — RideSharePro',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* LEFT — Blue panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px]
                      flex-col justify-between p-10
                      bg-[#3B3FE4] relative overflow-hidden flex-shrink-0">

        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, 
              white 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Top — Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-md
                          flex items-center justify-center">
            <span className="text-white text-sm">🚗</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            RideSharePro
          </span>
        </div>

        {/* Middle — Hero text */}
        <div className="relative z-10">
          <p className="text-white/60 text-sm mb-3">
            Welcome back to
          </p>
          <h1 className="text-white font-bold text-3xl
                         leading-tight mb-8">
            India's safest<br />carpooling platform
          </h1>

          {/* Feature list */}
          <div className="flex flex-col gap-3">
            {[
              { icon: '✓', text: 'Government ID verified users',  color: 'text-green-300' },
              { icon: '✓', text: 'Women-only rides available',     color: 'text-green-300' },
              { icon: '⚠', text: '24/7 Emergency support',        color: 'text-yellow-300' },
              { icon: '✓', text: 'Community of 10M+ riders',       color: 'text-green-300' },
            ].map((f) => (
              <div key={f.text}
                className="flex items-center gap-3">
                <span className={`text-sm ${f.color}`}>{f.icon}</span>
                <span className="text-white/80 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Testimonial */}
        <div className="relative z-10">
          <blockquote className="text-white/70 text-sm
                                  italic leading-relaxed mb-3">
            "Best carpooling platform I've used. 
            Saved over ₹5,000 in 2 months."
          </blockquote>
          <p className="text-white/50 text-xs">
            — Priya S., Bangalore
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 flex items-center justify-center
                      bg-white px-8 py-12">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-xl">🚗</span>
            <span className="font-bold text-[#3B3FE4]">
              RideSharePro
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Sign in
            </h2>
            <p className="text-gray-500 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          <LoginForm />

        </div>
      </div>

    </div>
  )
}