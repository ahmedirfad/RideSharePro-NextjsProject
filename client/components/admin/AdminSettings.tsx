'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Wallet, Bell, Shield, Save, Loader2,
  CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight,
  ChevronRight, RefreshCw, Zap
} from 'lucide-react'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────
interface GeneralSettings {
  platformName: string; supportEmail: string; contactPhone: string
  timezone: string; currency: string; language: string
  maxDetourKm: number; minTripDistanceKm: number
  maxPassengersPerVehicle: number; womenOnlyMode: boolean
  autoCompleteMinutes: number
}
interface FeeSettings {
  platformFeePercent: number; driverPayoutPercent: number
  minFareINR: number; cancellationFeeINR: number
  escrowReleaseHours: number; refundWindowHours: number; gstPercent: number
}
interface NotificationSettings {
  emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean
  bookingConfirmation: boolean; tripReminder: boolean
  tripReminderMinutes: number; disputeAlerts: boolean
  payoutAlerts: boolean; adminDigestEnabled: boolean
  adminDigestFrequency: string
}
interface SecuritySettings {
  requireEmailVerification: boolean; otpExpiryMinutes: number
  maxOtpAttempts: number; accessTokenExpiryMins: number
  refreshTokenExpiryDays: number; maxLoginAttempts: number
  loginLockoutMinutes: number; requireKycForHosting: boolean
  allowGoogleAuth: boolean; maintenanceMode: boolean
}
interface AllSettings {
  general: GeneralSettings; fees: FeeSettings
  notifications: NotificationSettings; security: SecuritySettings
}

// ─── Reusable field components ────────────────────────────────
function FieldLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-300">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string | number; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
        placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
    />
  )
}

function NumberInput({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <input
      type="number" value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
    />
  )
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition">
      {options.map((o) => <option key={o.value} value={o.value} className="bg-[#13172a]">{o.label}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <FieldLabel label={label} sub={sub} />
      <button onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${checked ? 'bg-blue-600' : 'bg-white/10'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 space-y-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  )
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">{label}</label>
      {sub && <p className="text-[10px] text-gray-600 -mt-1">{sub}</p>}
      {children}
    </div>
  )
}

// ─── Slider ───────────────────────────────────────────────────
function SliderField({ label, sub, value, onChange, min, max, unit }: {
  label: string; sub?: string; value: number; onChange: (v: number) => void
  min: number; max: number; unit: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>
        <span className="text-xs font-bold text-blue-400">{value} {unit}</span>
      </div>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
      <div className="relative">
        <input type="range" min={min} max={max} value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/40"
          style={{ background: `linear-gradient(to right, #3b82f6 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 0)` }}
        />
        <div className="flex justify-between text-[9px] text-gray-600 mt-1">
          <span>{min}{unit}</span><span>{max}{unit}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ message, type, onDone }: { message: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold
      ${type === 'success' ? 'bg-[#13172a] border-green-500/30 text-green-400' : 'bg-[#13172a] border-red-500/30 text-red-400'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {message}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════
const TABS = [
  { id: 'general',       label: 'General',        icon: Settings },
  { id: 'fees',          label: 'Platform Fees',  icon: Wallet   },
  { id: 'notifications', label: 'Notifications',  icon: Bell     },
  { id: 'security',      label: 'Security',       icon: Shield   },
]

// ─── General tab ─────────────────────────────────────────────
function GeneralTab({ data, onChange }: { data: GeneralSettings; onChange: (d: GeneralSettings) => void }) {
  const set = (k: keyof GeneralSettings, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="space-y-4">
      <SectionCard title="Platform Identity">
        <Row2>
          <Field label="Platform Name">
            <TextInput value={data.platformName} onChange={(v) => set('platformName', v)} />
          </Field>
          <Field label="Support Email">
            <TextInput value={data.supportEmail} type="email" onChange={(v) => set('supportEmail', v)} />
          </Field>
          <Field label="Contact Phone">
            <TextInput value={data.contactPhone} onChange={(v) => set('contactPhone', v)} />
          </Field>
          <Field label="Timezone">
            <SelectInput value={data.timezone} onChange={(v) => set('timezone', v)} options={[
              { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
              { value: 'UTC', label: 'UTC' },
              { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
            ]} />
          </Field>
          <Field label="Currency">
            <SelectInput value={data.currency} onChange={(v) => set('currency', v)} options={[
              { value: 'INR', label: 'INR (₹) — Indian Rupee' },
              { value: 'USD', label: 'USD ($) — US Dollar' },
              { value: 'AED', label: 'AED — UAE Dirham' },
            ]} />
          </Field>
          <Field label="Language">
            <SelectInput value={data.language} onChange={(v) => set('language', v)} options={[
              { value: 'en-IN', label: 'English (IN)' },
              { value: 'en-US', label: 'English (US)' },
              { value: 'ml-IN', label: 'Malayalam (IN)' },
            ]} />
          </Field>
        </Row2>
      </SectionCard>

      <SectionCard title="Ride & Dispatch Logistics">
        <SliderField label="Detour Maximum Radius" value={data.maxDetourKm}
          onChange={(v) => set('maxDetourKm', v)} min={1} max={20} unit="km" />
        <Row2>
          <Field label="Min Trip Distance (km)">
            <NumberInput value={data.minTripDistanceKm} onChange={(v) => set('minTripDistanceKm', v)} min={0.5} step={0.5} />
          </Field>
          <Field label="Max Passengers per Vehicle">
            <SelectInput value={String(data.maxPassengersPerVehicle)} onChange={(v) => set('maxPassengersPerVehicle', parseInt(v))} options={
              [2,3,4,5,6,7,8].map((n) => ({ value: String(n), label: String(n) }))
            } />
          </Field>
        </Row2>
        <div className="space-y-0">
          <Toggle checked={data.womenOnlyMode} onChange={(v) => set('womenOnlyMode', v)}
            label="Women-Only Mode" sub="Allow female drivers and passengers to opt for same-gender rides." />
        </div>
        <Field label="Auto-Complete Timer (min)" sub="Auto-finish ride if GPS stops at destination">
          <NumberInput value={data.autoCompleteMinutes} onChange={(v) => set('autoCompleteMinutes', v)} min={1} max={60} />
        </Field>
      </SectionCard>
    </div>
  )
}

// ─── Fees tab ────────────────────────────────────────────────
function FeesTab({ data, onChange }: { data: FeeSettings; onChange: (d: FeeSettings) => void }) {
  const set = (k: keyof FeeSettings, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="space-y-4">
      <SectionCard title="Commission Structure">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Platform Fee (%)" sub="Deducted from each booking">
            <div className="relative">
              <NumberInput value={data.platformFeePercent} onChange={(v) => {
                set('platformFeePercent', v)
                onChange({ ...data, platformFeePercent: v, driverPayoutPercent: parseFloat((100 - v).toFixed(2)) })
              }} min={0} max={30} step={0.5} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
            </div>
          </Field>
          <Field label="Driver Payout (%)" sub="Auto-calculated">
            <div className="relative">
              <input readOnly value={data.driverPayoutPercent}
                className="w-full bg-white/3 border border-white/5 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">%</span>
            </div>
          </Field>
          <Field label="GST (%)" sub="If applicable (0 to disable)">
            <div className="relative">
              <NumberInput value={data.gstPercent} onChange={(v) => set('gstPercent', v)} min={0} max={30} step={0.5} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
            </div>
          </Field>
        </div>

        {/* Live preview */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-2">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3">Live Preview — ₹500 fare</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Passenger pays', value: `₹${Math.round(500 * (1 + data.gstPercent / 100))}` },
              { label: 'Platform earns', value: `₹${Math.round(500 * data.platformFeePercent / 100)}` },
              { label: 'Driver receives', value: `₹${Math.round(500 * data.driverPayoutPercent / 100)}` },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-lg font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>{item.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Fare Rules">
        <Row2>
          <Field label="Minimum Fare (₹)" sub="No booking below this amount">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <input type="number" min={0} value={data.minFareINR} onChange={(e) => set('minFareINR', parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>
          </Field>
          <Field label="Cancellation Fee (₹)" sub="0 = no penalty">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <input type="number" min={0} value={data.cancellationFeeINR} onChange={(e) => set('cancellationFeeINR', parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>
          </Field>
          <Field label="Escrow Release (hours)" sub="Hours after trip end to auto-release funds">
            <NumberInput value={data.escrowReleaseHours} onChange={(v) => set('escrowReleaseHours', v)} min={1} max={168} />
          </Field>
          <Field label="Refund Window (hours)" sub="Passenger refund eligibility period">
            <NumberInput value={data.refundWindowHours} onChange={(v) => set('refundWindowHours', v)} min={1} max={168} />
          </Field>
        </Row2>
      </SectionCard>
    </div>
  )
}

// ─── Notifications tab ────────────────────────────────────────
function NotificationsTab({ data, onChange }: { data: NotificationSettings; onChange: (d: NotificationSettings) => void }) {
  const set = (k: keyof NotificationSettings, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="space-y-4">
      <SectionCard title="Channels">
        <Toggle checked={data.emailEnabled} onChange={(v) => set('emailEnabled', v)}
          label="Email Notifications" sub="Send transactional emails via SMTP / SendGrid" />
        <Toggle checked={data.smsEnabled} onChange={(v) => set('smsEnabled', v)}
          label="SMS Notifications" sub="Requires Twilio or similar provider configured" />
        <Toggle checked={data.pushEnabled} onChange={(v) => set('pushEnabled', v)}
          label="Push Notifications" sub="Mobile push via Firebase Cloud Messaging" />
      </SectionCard>

      <SectionCard title="Triggers">
        <Toggle checked={data.bookingConfirmation} onChange={(v) => set('bookingConfirmation', v)}
          label="Booking Confirmation" sub="Notify passenger + driver when a seat is booked" />
        <Toggle checked={data.tripReminder} onChange={(v) => set('tripReminder', v)}
          label="Trip Reminder" sub="Send reminder before departure" />
        {data.tripReminder && (
          <Field label="Reminder Lead Time (minutes)">
            <NumberInput value={data.tripReminderMinutes} onChange={(v) => set('tripReminderMinutes', v)} min={5} max={1440} />
          </Field>
        )}
        <Toggle checked={data.disputeAlerts} onChange={(v) => set('disputeAlerts', v)}
          label="Dispute Alerts" sub="Notify admin when a new dispute is filed" />
        <Toggle checked={data.payoutAlerts} onChange={(v) => set('payoutAlerts', v)}
          label="Payout Alerts" sub="Notify driver when escrow is released" />
      </SectionCard>

      <SectionCard title="Admin Digest">
        <Toggle checked={data.adminDigestEnabled} onChange={(v) => set('adminDigestEnabled', v)}
          label="Admin Digest Email" sub="Periodic summary report sent to admin email" />
        {data.adminDigestEnabled && (
          <Field label="Digest Frequency">
            <SelectInput value={data.adminDigestFrequency} onChange={(v) => set('adminDigestFrequency', v)} options={[
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]} />
          </Field>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Security tab ─────────────────────────────────────────────
function SecurityTab({ data, onChange, onMaintenanceToggle, maintenanceLoading }: {
  data: SecuritySettings; onChange: (d: SecuritySettings) => void
  onMaintenanceToggle: () => void; maintenanceLoading: boolean
}) {
  const set = (k: keyof SecuritySettings, v: any) => onChange({ ...data, [k]: v })
  return (
    <div className="space-y-4">

      {/* Maintenance mode banner */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-colors ${
        data.maintenanceMode ? 'bg-red-500/10 border-red-500/30' : 'bg-[#0d1117] border-white/8'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            data.maintenanceMode ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-500'
          }`}>
            <Zap size={18} />
          </div>
          <div>
            <p className={`text-sm font-bold ${data.maintenanceMode ? 'text-red-400' : 'text-white'}`}>
              Maintenance Mode {data.maintenanceMode ? '— ACTIVE' : '— Off'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              When active, all non-admin users see a maintenance page. Trips are paused.
            </p>
          </div>
        </div>
        <button onClick={onMaintenanceToggle} disabled={maintenanceLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            data.maintenanceMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
          }`}>
          {maintenanceLoading ? <Loader2 size={13} className="animate-spin" /> : null}
          {data.maintenanceMode ? 'Disable' : 'Enable'}
        </button>
      </div>

      <SectionCard title="Authentication">
        <Toggle checked={data.requireEmailVerification} onChange={(v) => set('requireEmailVerification', v)}
          label="Require Email Verification" sub="New accounts must verify email before logging in" />
        <Toggle checked={data.allowGoogleAuth} onChange={(v) => set('allowGoogleAuth', v)}
          label="Allow Google Sign-In" sub="Enable OAuth login via Google" />
        <Toggle checked={data.requireKycForHosting} onChange={(v) => set('requireKycForHosting', v)}
          label="Require KYC for Hosting" sub="Drivers must complete verification before posting trips" />
      </SectionCard>

      <SectionCard title="OTP & Token Expiry">
        <Row2>
          <Field label="OTP Expiry (minutes)">
            <NumberInput value={data.otpExpiryMinutes} onChange={(v) => set('otpExpiryMinutes', v)} min={1} max={60} />
          </Field>
          <Field label="Max OTP Attempts">
            <NumberInput value={data.maxOtpAttempts} onChange={(v) => set('maxOtpAttempts', v)} min={1} max={10} />
          </Field>
          <Field label="Access Token Expiry (mins)">
            <NumberInput value={data.accessTokenExpiryMins} onChange={(v) => set('accessTokenExpiryMins', v)} min={5} max={60} />
          </Field>
          <Field label="Refresh Token Expiry (days)">
            <NumberInput value={data.refreshTokenExpiryDays} onChange={(v) => set('refreshTokenExpiryDays', v)} min={1} max={90} />
          </Field>
        </Row2>
      </SectionCard>

      <SectionCard title="Login Protection">
        <Row2>
          <Field label="Max Login Attempts" sub="Before account lockout">
            <NumberInput value={data.maxLoginAttempts} onChange={(v) => set('maxLoginAttempts', v)} min={1} max={20} />
          </Field>
          <Field label="Lockout Duration (minutes)">
            <NumberInput value={data.loginLockoutMinutes} onChange={(v) => set('loginLockoutMinutes', v)} min={1} max={1440} />
          </Field>
        </Row2>
      </SectionCard>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<AllSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/settings')
      if (res.data.success) setSettings(res.data.data)
    } catch {
      showToast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await api.put('/admin/settings', {
        [activeTab]: settings[activeTab as keyof AllSettings],
      })
      if (res.data.success) {
        showToast('Settings saved successfully')
        setSettings(res.data.data)
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleMaintenanceToggle = async () => {
    if (!settings) return
    setMaintenanceLoading(true)
    try {
      const res = await api.put('/admin/settings/maintenance', {
        enabled: !settings.security.maintenanceMode,
      })
      if (res.data.success) {
        setSettings((prev) => prev ? {
          ...prev,
          security: { ...prev.security, maintenanceMode: res.data.maintenanceMode },
        } : prev)
        showToast(res.data.message)
      }
    } catch {
      showToast('Failed to toggle maintenance mode', 'error')
    } finally {
      setMaintenanceLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
            System Settings
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Configure your core platform identity and operational preferences.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSettings} disabled={loading}
            className="p-2 bg-white/5 border border-white/8 rounded-xl text-gray-400 hover:text-white transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 shadow-lg shadow-blue-900/30">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save {TABS.find(t => t.id === activeTab)?.label} Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 items-start">

        {/* Sidebar tabs */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl p-2 lg:sticky lg:top-4">
          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest px-3 py-2">Settings Menu</p>
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition mb-0.5 ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}>
                <Icon size={15} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
                {tab.label}
                {isActive && <ChevronRight size={13} className="ml-auto text-blue-400" />}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : !settings ? (
            <div className="text-center text-gray-500 py-12">Failed to load settings.</div>
          ) : (
            <>
              {activeTab === 'general' && (
                <GeneralTab data={settings.general}
                  onChange={(d) => setSettings({ ...settings, general: d })} />
              )}
              {activeTab === 'fees' && (
                <FeesTab data={settings.fees}
                  onChange={(d) => setSettings({ ...settings, fees: d })} />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab data={settings.notifications}
                  onChange={(d) => setSettings({ ...settings, notifications: d })} />
              )}
              {activeTab === 'security' && (
                <SecurityTab data={settings.security}
                  onChange={(d) => setSettings({ ...settings, security: d })}
                  onMaintenanceToggle={handleMaintenanceToggle}
                  maintenanceLoading={maintenanceLoading} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}