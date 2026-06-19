'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, CreditCard, Link2, Bell, ChevronRight,
  RefreshCw, SlidersHorizontal, Download, AlertTriangle,
  Mail, Phone, CreditCard as IdCard, Car, Ghost, EyeOff,
  BadgeCheck, Trash2, MapPin, TrendingUp, Search
} from 'lucide-react'

// Toggle Component
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shrink-0 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// Toast Hook
function useToast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)
  const show = (m: string) => {
    setMsg(m)
    setVisible(true)
    setTimeout(() => setVisible(false), 2800)
  }
  return { msg, visible, show }
}

// Pill Component
function Pill({ children, color }: { children: React.ReactNode; color: 'green' | 'amber' | 'red' | 'blue' }) {
  const cls = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  }[color]
  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide ${cls}`}>{children}</span>
}

// Card Components
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>{children}</div>
}

function CardHead({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {icon && <span className="text-blue-600">{icon}</span>}
    </div>
  )
}

// Setting Row Component
function SettingRow({
  icon, iconBg, title, sub, right,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  sub: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition cursor-pointer">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      {right ?? <ChevronRight size={14} className="text-gray-300" />}
    </div>
  )
}

// Deactivate Modal
function DeactivateModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Deactivate Account?</h3>
            <p className="text-xs text-gray-400">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          Deactivating your account is permanent. All trip history, earned rewards, messages, and payment data will be wiped immediately.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition">
            Yes, Deactivate
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function SettingsPage() {
  const router = useRouter()
  const toast = useToast()

  // Toggles State
  const [twoFA, setTwoFA] = useState(true)
  const [tripAlerts, setTripAlerts] = useState(true)
  const [chatNotif, setChatNotif] = useState(true)
  const [promoNotif, setPromoNotif] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [ghostMode, setGhostMode] = useState(false)
  const [hidePhone, setHidePhone] = useState(true)
  const [distUnit, setDistUnit] = useState<'km' | 'mi'>('km')
  const [deactOpen, setDeactOpen] = useState(false)
  const [language, setLanguage] = useState('English (IN)')
  const [timezone, setTimezone] = useState('IST (UTC+05:30)')
  const [theme, setTheme] = useState('System default')
  const [mapStyle, setMapStyle] = useState('Street')

  const showToast = (msg: string) => toast.show(msg)

  return (
    <div className="space-y-5">
      <DeactivateModal open={deactOpen} onClose={() => setDeactOpen(false)} onConfirm={() => { setDeactOpen(false); showToast('Account deactivation initiated') }} />

      {/* Toast Notification */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2.5 shadow-xl transition-all duration-300 ${
        toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        {toast.msg}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search settings..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHead title="Account Settings" icon={<RefreshCw size={15} />} />
        <SettingRow
          icon={<ShieldCheck size={16} className="text-blue-600" />}
          iconBg="bg-blue-100"
          title="Password & Security"
          sub="Last changed 3 months ago"
        />
        <SettingRow
          icon={<CreditCard size={16} className="text-green-600" />}
          iconBg="bg-green-100"
          title="Payment Methods"
          sub="Visa ending in •••• 4242"
        />
        <SettingRow
          icon={<Link2 size={16} className="text-gray-500" />}
          iconBg="bg-gray-100"
          title="Linked Accounts"
          sub="Google, Apple linked"
        />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bell size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p>
              <p className="text-xs text-gray-400 mt-0.5">Authenticator app enabled</p>
            </div>
          </div>
          <Toggle checked={twoFA} onChange={(v) => { setTwoFA(v); showToast('2FA settings updated') }} label="Toggle 2FA" />
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHead title="Notification Preferences" icon={<SlidersHorizontal size={15} />} />
        {[
          { label: 'Trip updates & alerts', sub: 'Booking confirmations, cancellations', val: tripAlerts, set: setTripAlerts },
          { label: 'Chat messages', sub: 'Messages from drivers & passengers', val: chatNotif, set: setChatNotif },
          { label: 'Promotions & offers', sub: 'Exclusive deals, referral rewards', val: promoNotif, set: setPromoNotif },
          { label: 'Weekly summary digest', sub: 'Earnings, trip stats, insights', val: weeklyDigest, set: setWeeklyDigest },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
            <Toggle checked={item.val} onChange={(v) => { item.set(v); showToast('Notification preference saved') }} label={`Toggle ${item.label}`} />
          </div>
        ))}
      </Card>

      {/* Preferences */}
      <Card>
        <CardHead title="Preferences" icon={<SlidersHorizontal size={15} />} />
        <div className="grid grid-cols-2 gap-4 p-5">
          {[
            { label: 'Language', val: language, set: setLanguage, options: ['English (IN)', 'Hindi', 'Malayalam', 'Tamil', 'Kannada'] },
            { label: 'Timezone', val: timezone, set: setTimezone, options: ['IST (UTC+05:30)', '(GMT-05:00) Eastern Time', '(GMT+00:00) UTC'] },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{field.label}</label>
              <select
                value={field.val}
                onChange={(e) => { field.set(e.target.value); showToast(`${field.label} updated`) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 px-5 pb-4">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-2">Distance Units</label>
          <div className="flex gap-2">
            {(['km', 'mi'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => { setDistUnit(unit); showToast(`Distance unit set to ${unit === 'km' ? 'kilometres' : 'miles'}`) }}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  distUnit === unit
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {unit === 'km' ? 'Kilometres (km)' : 'Miles (mi)'}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-100 grid grid-cols-2 gap-4 p-5">
          {[
            { label: 'Theme', val: theme, set: setTheme, options: ['System default', 'Light', 'Dark'] },
            { label: 'Map Style', val: mapStyle, set: setMapStyle, options: ['Street', 'Satellite', 'Dark'] },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">{field.label}</label>
              <select
                value={field.val}
                onChange={(e) => { field.set(e.target.value); showToast(`${field.label} applied`) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Safety & Privacy Card */}
      <Card>
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-green-50">
          <ShieldCheck size={15} className="text-green-600" />
          <span className="text-sm font-bold text-green-800">Safety & Privacy</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Your safety is our priority. Your profile details are only shared with confirmed ride partners.
          </p>
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <BadgeCheck size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Verified Driver Badge</span>
            </div>
            <Pill color="green">Active</Pill>
          </div>
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Ghost size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Ghost Mode</span>
            </div>
            <Toggle checked={ghostMode} onChange={(v) => { setGhostMode(v); showToast('Ghost mode toggled') }} label="Ghost mode" />
          </div>
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <EyeOff size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Hide Phone Number</span>
            </div>
            <Toggle checked={hidePhone} onChange={(v) => { setHidePhone(v); showToast('Phone visibility updated') }} label="Hide phone" />
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition">
            <Download size={13} /> Download Data Archive
          </button>
        </div>
      </Card>

      {/* Journey Stats Card */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-5 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center mb-3">
          <TrendingUp size={18} className="text-white" />
        </div>
        <p className="font-bold text-base leading-snug">Your Journey Continues</p>
        <p className="text-xs text-white/60 mt-0.5">Keep sharing rides, keep saving</p>
        <div className="flex items-baseline gap-1.5 mt-3">
          <span className="text-2xl font-bold">1,240</span>
          <span className="text-xs text-white/55">km shared this year</span>
        </div>
        <div className="mt-2 h-1 bg-white/15 rounded-full overflow-hidden">
          <div className="h-full w-[62%] bg-white/55 rounded-full" />
        </div>
        <p className="text-[10px] text-white/40 mt-1.5">62% to next milestone — 2,000 km</p>
      </div>

      {/* Verification Status */}
      <Card>
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verification Status</p>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { icon: <Mail size={13} className="text-gray-400" />, label: 'Email Address', status: 'green' as const, pill: 'Verified' },
            { icon: <Phone size={13} className="text-gray-400" />, label: 'Phone Number', status: 'green' as const, pill: 'Verified' },
            { icon: <IdCard size={13} className="text-gray-400" />, label: 'Government ID', status: 'amber' as const, pill: 'Pending' },
            { icon: <Car size={13} className="text-gray-400" />, label: 'Vehicle RC', status: 'red' as const, pill: 'Missing' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                {item.icon} {item.label}
              </div>
              <Pill color={item.status}>{item.pill}</Pill>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
          <AlertTriangle size={14} className="text-red-600" />
          <span className="text-sm font-bold text-red-800">Danger Zone</span>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 leading-relaxed mb-3">
            Deactivating your account is permanent. All trip history, earned rewards, messages, and payment data will be wiped immediately.
          </p>
          <button
            onClick={() => setDeactOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-red-50 border border-red-300 text-red-600 text-xs font-bold rounded-xl transition"
          >
            <Trash2 size={13} /> Deactivate Account
          </button>
        </div>
      </Card>
    </div>
  )
}