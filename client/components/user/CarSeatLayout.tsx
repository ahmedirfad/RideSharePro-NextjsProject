'use client'

// CarSeatLayout.tsx
// Top-down car interior view — driver seat fixed top-RIGHT (India: right-hand drive),
// passenger seats scale dynamically from totalSeats prop.
// Matches RedBus-style seat picker UX for a car (4-seater, 5-seater, etc.)

interface SeatInfo {
  seatNumber: number
  available: boolean
}

interface CarSeatLayoutProps {
  totalSeats: number                          // passenger seats only (excludes driver)
  seatMap: SeatInfo[]                        // availability per seat
  selectedSeat: number | null
  setSelectedSeat: (seat: number | null) => void
  womenOnly?: boolean
}

// ─── Seat renders ──────────────────────────────────────────────────────────────
function Seat({
  seatNumber,
  state,           // 'available' | 'selected' | 'booked' | 'driver'
  onClick,
}: {
  seatNumber: number
  state: 'available' | 'selected' | 'booked' | 'driver'
  onClick?: () => void
}) {
  const isClickable = state === 'available' || state === 'selected'

  const backBase = 'rounded-t-lg h-3 w-full border-x border-t transition-colors duration-150'
  const bodyBase = 'rounded-b-xl h-12 w-full border flex flex-col items-center justify-center gap-0.5 transition-colors duration-150'

  const stateStyles = {
    driver: {
      back: `${backBase} bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700`,
      body: `${bodyBase} bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700`,
      label: 'text-gray-400 dark:text-gray-600',
      icon: 'text-gray-400 dark:text-gray-600',
    },
    available: {
      back: `${backBase} bg-white border-gray-300 hover:border-blue-400 dark:bg-gray-900 dark:border-gray-600 dark:hover:border-blue-500`,
      body: `${bodyBase} bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:bg-gray-900 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-950`,
      label: 'text-gray-500 dark:text-gray-400',
      icon: 'text-gray-400 dark:text-gray-500',
    },
    selected: {
      back: `${backBase} bg-blue-600 border-blue-600`,
      body: `${bodyBase} bg-blue-600 border-blue-600`,
      label: 'text-white',
      icon: 'text-white',
    },
    booked: {
      back: `${backBase} bg-gray-100 border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-600`,
      body: `${bodyBase} bg-gray-100 border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-600`,
      label: 'text-gray-400 dark:text-gray-600',
      icon: 'text-gray-300 dark:text-gray-600',
    },
  }

  const s = stateStyles[state]

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        state === 'driver'
          ? 'Driver seat'
          : `Seat ${seatNumber}, ${state === 'booked' ? 'booked' : state === 'selected' ? 'selected' : 'available'}`
      }
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() } : undefined}
      className={`flex flex-col items-center gap-0.5 w-[52px] shrink-0 select-none ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Headrest */}
      <div className={s.back} />

      {/* Seat body */}
      <div className={s.body}>
        {state === 'driver' ? (
          // Steering wheel icon (inline SVG — no emoji)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            className={`w-5 h-5 ${s.icon}`} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="3" x2="12" y2="9" />
            <line x1="3.5" y1="16.5" x2="8.8" y2="13.5" />
            <line x1="20.5" y1="16.5" x2="15.2" y2="13.5" />
          </svg>
        ) : state === 'booked' ? (
          // X mark
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`w-4 h-4 ${s.icon}`} aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : state === 'selected' ? (
          // Checkmark
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`w-4 h-4 ${s.icon}`} aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          // Person silhouette
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            className={`w-4 h-4 ${s.icon}`} aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-4 3.1-7 7-7s7 3 7 7" />
          </svg>
        )}
      </div>

      {/* Label */}
      <span className={`text-[10px] font-semibold mt-0.5 ${s.label}`}>
        {state === 'driver' ? 'Driver' : seatNumber}
      </span>
    </div>
  )
}

// ─── Center console strip ──────────────────────────────────────────────────────
function CenterConsole({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`w-6 shrink-0 flex flex-col items-center justify-center gap-2 ${tall ? 'py-2' : ''}`}>
      <div className="w-1.5 h-1.5 rounded-full border border-gray-300 dark:border-gray-600" />
      <div className="w-1 flex-1 min-h-[8px] max-h-[40px] bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="w-1.5 h-1.5 rounded-full border border-gray-300 dark:border-gray-600" />
    </div>
  )
}

// ─── Divider between front and rear ───────────────────────────────────────────
function RowDivider() {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
      <span className="text-[9px] text-gray-300 dark:text-gray-600 uppercase tracking-widest shrink-0">
        back seat
      </span>
      <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CarSeatLayout({
  totalSeats,
  seatMap,
  selectedSeat,
  setSelectedSeat,
  womenOnly = false,
}: CarSeatLayoutProps) {

  const getSeatState = (n: number): 'available' | 'selected' | 'booked' => {
    if (selectedSeat === n) return 'selected'
    const info = seatMap.find(s => s.seatNumber === n)
    if (!info) return 'available'
    return info.available ? 'available' : 'booked'
  }

  const handleClick = (n: number) => {
    const info = seatMap.find(s => s.seatNumber === n)
    if (info && !info.available) return
    setSelectedSeat(selectedSeat === n ? null : n)
  }

  // ── Layout logic ────────────────────────────────────────────────────────────
  // Seat 1 = front passenger (next to driver)
  // Seats 2..N = rear rows of up to 3 per row
  const rearSeats: number[] = Array.from({ length: totalSeats - 1 }, (_, i) => i + 2)
  const rearRows: number[][] = []
  const REAR_PER_ROW = 3

  for (let i = 0; i < rearSeats.length; i += REAR_PER_ROW) {
    rearRows.push(rearSeats.slice(i, i + REAR_PER_ROW))
  }

  const freeCount = seatMap.filter(s => s.available).length

  return (
    <div>
      {/* Status strip */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-600 inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block" />
            Selected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-gray-100 border border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-600 inline-block" />
            Booked
          </span>
        </div>
        <span className="text-xs font-semibold text-gray-500">
          {freeCount} seat{freeCount !== 1 ? 's' : ''} free
        </span>
      </div>

      {/* Car body - RIGHT HAND DRIVE (India) */}
      <div className="relative border-2 border-gray-200 dark:border-gray-700 rounded-[28px] bg-gray-50 dark:bg-gray-900/40 px-6 py-5">

        {/* Hood nub (top) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-b-full" />
        {/* Boot nub (bottom) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-t-full" />
        {/* Left mirror */}
        <div className="absolute top-10 -left-2.5 w-2.5 h-5 bg-gray-200 dark:bg-gray-700 rounded-l-md" />
        {/* Right mirror */}
        <div className="absolute top-10 -right-2.5 w-2.5 h-5 bg-gray-200 dark:bg-gray-700 rounded-r-md" />

        {/* Front row - Driver on RIGHT side */}
        <div className="flex items-end gap-0 justify-center mb-1">
          {/* Front passenger on LEFT */}
          {totalSeats >= 1 && (
            <Seat
              seatNumber={1}
              state={getSeatState(1)}
              onClick={() => handleClick(1)}
            />
          )}
          <CenterConsole />
          {/* Driver on RIGHT */}
          <Seat seatNumber={0} state="driver" />
        </div>

        {/* Rear rows */}
        {rearRows.length > 0 && (
          <>
            <RowDivider />
            {rearRows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex justify-center gap-2 mt-2">
                {row.map(sn => (
                  <Seat
                    key={sn}
                    seatNumber={sn}
                    state={getSeatState(sn)}
                    onClick={() => handleClick(sn)}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        {/* Women-only badge */}
        {womenOnly && (
          <div className="absolute top-2 right-3 bg-rose-100 border border-rose-200 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Women only
          </div>
        )}
      </div>

      {/* Selection feedback */}
      <div className="mt-3 text-center min-h-[20px]">
        {selectedSeat ? (
          <p className="text-sm font-semibold text-blue-600">
            Seat {selectedSeat} selected
          </p>
        ) : (
          <p className="text-xs text-gray-400">Tap an available seat to select</p>
        )}
      </div>
    </div>
  )
}