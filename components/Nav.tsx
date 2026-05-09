'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const NAV_LINKS = ['Events', 'Services', 'About', 'Contact'] as const

export default function Nav() {
  const navRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Entrance — slide down from above on load
    gsap.fromTo(
      navRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out', delay: 0.4 }
    )

    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      ref={navRef}
      className={[
        'fixed top-0 left-0 right-0 z-50',
        'h-16 flex items-center justify-between',
        'px-8 md:px-16',
        'transition-all duration-700',
        scrolled
          ? 'backdrop-blur-xl bg-black/60 border-b border-gold/[0.07]'
          : '',
      ].join(' ')}
    >
      {/* Wordmark */}
      <a
        href="#"
        className="font-mono text-[11px] tracking-[0.45em] uppercase text-white hover:text-gold transition-colors duration-300"
      >
        High Class
      </a>

      {/* Links — hidden on mobile */}
      <ul className="hidden md:flex items-center gap-10">
        {NAV_LINKS.map((item) => (
          <li key={item}>
            <a
              href={`#${item.toLowerCase()}`}
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/40 hover:text-gold transition-colors duration-300"
            >
              {item}
            </a>
          </li>
        ))}
      </ul>

      {/* Book Now CTA */}
      <a href="#book" className="btn-gold !text-[10px] !px-6 !py-3">
        Book Now
      </a>
    </nav>
  )
}
