'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || 'ontouchstart' in window) return

    const move = ({ clientX: x, clientY: y }: MouseEvent) => {
      gsap.set(dot.current, { x, y })
      gsap.to(ring.current, { x, y, duration: 0.22, ease: 'power2.out' })
    }

    const grow = () =>
      gsap.to(ring.current, { scale: 2.4, borderColor: 'rgba(212,175,55,0.65)', duration: 0.3 })
    const shrink = () =>
      gsap.to(ring.current, { scale: 1, borderColor: 'rgba(212,175,55,0.3)', duration: 0.3 })

    window.addEventListener('mousemove', move)

    // Re-query on every mount so dynamic content is covered
    const bindCursor = () => {
      document.querySelectorAll('a,button').forEach((el) => {
        el.addEventListener('mouseenter', grow)
        el.addEventListener('mouseleave', shrink)
      })
    }
    bindCursor()

    return () => window.removeEventListener('mousemove', move)
  }, [])

  const base: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    willChange: 'transform',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
  }

  return (
    <>
      {/* Precise gold dot — instant follow */}
      <div
        ref={dot}
        aria-hidden="true"
        style={{ ...base, width: 6, height: 6, background: '#D4AF37', zIndex: 9999 }}
      />
      {/* Lagging ring — expands on interactives */}
      <div
        ref={ring}
        aria-hidden="true"
        style={{
          ...base,
          width: 34,
          height: 34,
          border: '1px solid rgba(212,175,55,0.3)',
          zIndex: 9998,
        }}
      />
    </>
  )
}
