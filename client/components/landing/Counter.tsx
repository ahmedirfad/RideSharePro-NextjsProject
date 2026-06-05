'use client'

import { useEffect, useState, useRef } from 'react'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

export function Counter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0)
  const { ref, visible } = useInView()
  useEffect(() => {
    if (!visible) return
    let start = 0
    const step = end / 60
    const t = setInterval(() => {
      start += step
      if (start >= end) { setVal(end); clearInterval(t) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(t)
  }, [visible, end])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}