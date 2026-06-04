import RegisterForm from '@/components/auth/RegisterForm'

export const metadata = {
  title: 'Create Account — RideSharePro',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex">

      {/* LEFT — Blue panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px]
                      flex-col justify-between p-10
                      bg-[#3B3FE4] relative overflow-hidden flex-shrink-0">

        {/* Dot texture */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%,
              white 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-md
                          flex items-center justify-center">
            <span className="text-white text-sm">🚗</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            RideSharePro
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <p className="text-white/60 text-sm mb-3">
            Join the community
          </p>
          <h1 className="text-white font-bold text-3xl
                         leading-tight mb-8">
            Start your carpooling<br />journey today
          </h1>

          <div className="flex flex-col gap-5">
            {[
              {
                icon: '✓',
                color: 'text-green-300',
                title: 'Smart AI Matching',
                desc: 'Instant pickup coordination.',
              },
              {
                icon: '🛡',
                color: 'text-blue-200',
                title: 'Stripe Escrow Payments',
                desc: 'Secure and automated transfers.',
              },
              {
                icon: '⏱',
                color: 'text-yellow-300',
                title: '24/7 SOS Support',
                desc: 'Immediate assistance anywhere.',
              },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className={`text-base mt-0.5 ${f.color}`}>
                  {f.icon}
                </span>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {f.title}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial card */}
        <div className="relative z-10 bg-white/10 border
                        border-white/20 rounded-xl p-5">
          <p className="text-white/80 text-sm italic leading-relaxed mb-3">
            "Joined 2 months ago, already saved<br />
            ₹4,200 on my commute."
          </p>
          <p className="text-white/50 text-xs">
            — Priya S., Bangalore
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 flex items-center justify-center
                      bg-white px-8 py-12 overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="text-xl">🚗</span>
            <span className="font-bold text-[#3B3FE4]">
              RideSharePro
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Create account
            </h2>
            <p className="text-gray-500 text-sm">
              Join thousands of smart commuters
            </p>
          </div>

          <RegisterForm />

        </div>
      </div>

    </div>
  )
}