'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from '@/components/Nav'
import AnimatedSwirls from '@/components/AnimatedSwirls'
import Cursor from '@/components/Cursor'
import IntroSequence from '@/components/IntroSequence'

gsap.registerPlugin(ScrollTrigger)

const Scene = dynamic(() => import('@/components/Scene'), { ssr: false })

// ─── Data ────────────────────────────────────────────────────────────────────

const EVENTS = [
  {
    id: 'evt_001',
    index: '01',
    label: 'Private Gala',
    title: ['The Obsidian', 'Evening'],
    date: 'December 14, 2024',
    location: 'Ritz Carlton Penthouse · New York',
    price: '$2,400',
    priceId: 'price_obsidian_evening',
    align: 'left' as const,
  },
  {
    id: 'evt_002',
    index: '02',
    label: 'VIP Weekend',
    title: ['Monaco Grand', 'Circuit'],
    date: 'January 18–20, 2025',
    location: 'Circuit de Monaco · Monte Carlo',
    price: '$8,800',
    priceId: 'price_monaco_circuit',
    align: 'right' as const,
  },
  {
    id: 'evt_003',
    index: '03',
    label: 'Members Only',
    title: ['Midnight at', 'Versailles'],
    date: 'February 8, 2025',
    location: 'Château de Versailles · Paris',
    price: '$5,600',
    priceId: 'price_versailles',
    align: 'center' as const,
  },
]

const SERVICES = [
  {
    n: '01',
    title: 'Private Venue Curation',
    desc: 'Access to the world\'s most exclusive venues — Michelin-starred rooms, historic palaces, estates otherwise closed to the public.',
  },
  {
    n: '02',
    title: 'VIP Transportation',
    desc: 'Rolls-Royce ground transfers, private jet arrangements, and superyacht charters tailored to your precise itinerary.',
  },
  {
    n: '03',
    title: 'White Glove Concierge',
    desc: '24/7 dedicated concierge handling every detail before, during, and after your experience.',
  },
  {
    n: '04',
    title: 'Bespoke Event Design',
    desc: 'Custom florals, ambient production, private performers, and curated menus designed exclusively around your vision.',
  },
]

// ─── Checkout ────────────────────────────────────────────────────────────────

async function startCheckout(priceId: string) {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  } catch (err) {
    console.error('Checkout error:', err)
  }
}

// ─── Alignment helper ─────────────────────────────────────────────────────────

const PANEL_ALIGN = {
  left: 'items-start text-left',
  right: 'items-end text-right',
  center: 'items-center text-center',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [ready, setReady] = useState(false)

  const onIntroComplete = useCallback(() => setReady(true), [])

  // ── GSAP setup — runs once the intro is dismissed ──────────────────────────
  useEffect(() => {
    if (!ready) return

    const ctx = gsap.context(() => {

      // ── 1. Opening entrance ────────────────────────────────────────────────
      const openTl = gsap.timeline({ delay: 0.2 })
      openTl
        .fromTo('#open-swirls', { opacity: 0, scale: 0.55 },
          { opacity: 1, scale: 1, duration: 1.8, ease: 'power3.out' })
        .fromTo('#open-label', { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.9')
        .fromTo('#open-h1', { opacity: 0, y: 72, skewY: 1.5 },
          { opacity: 1, y: 0, skewY: 0, duration: 1.3, ease: 'power4.out' }, '-=0.5')
        .fromTo('#open-scroll', { opacity: 0 },
          { opacity: 1, duration: 0.7 }, '-=0.2')

      // ── 2. Manifesto — pinned text beats ───────────────────────────────────
      // Set all beats offscreen before building the timeline
      gsap.set(['#beat-1', '#beat-2', '#beat-3'], { yPercent: 120, opacity: 0 })

      const mTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#manifesto',
          start: 'top top',
          end: '+=280%',
          scrub: 2,
          pin: true,
          anticipatePin: 1,
        },
      })

      mTl
        // Beat 1 — "EXPECT THE" — enters from below, left-aligned
        .to('#beat-1', { yPercent: 0, opacity: 1, duration: 0.18, ease: 'power2.out' })
        .to({}, { duration: 0.2 })  // hold
        .to('#beat-1', { yPercent: -120, opacity: 0, duration: 0.15, ease: 'power2.in' })
        // Beat 2 — "EXTRAORDINARY." — right-aligned, gold
        .to('#beat-2', { yPercent: 0, opacity: 1, duration: 0.18, ease: 'power2.out' }, '-=0.02')
        .to({}, { duration: 0.2 })
        .to('#beat-2', { yPercent: -120, opacity: 0, duration: 0.15, ease: 'power2.in' })
        // Beat 3 — "NOTHING LESS." — scale in, centred, stays
        .fromTo('#beat-3',
          { scale: 1.18, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' }, '-=0.02')
        .to({}, { duration: 0.2 }) // breathe before user scrolls away

      // ── 3. Events filmstrip — horizontal scroll, pinned ───────────────────
      const filmstrip = document.querySelector<HTMLElement>('.filmstrip')
      if (filmstrip) {
        gsap.to('.filmstrip', {
          x: () => -(filmstrip.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: '#events',
            start: 'top top',
            end: () => `+=${filmstrip.scrollWidth - window.innerWidth}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })

        // Filmstrip progress bar
        gsap.to('#film-progress', {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '#events',
            start: 'top top',
            end: () => `+=${filmstrip.scrollWidth - window.innerWidth}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
      }

      // ── 4. Services — curtain-wipe reveal per row ─────────────────────────
      gsap.utils.toArray<HTMLElement>('.service-row').forEach((row) => {
        gsap.fromTo(
          row,
          { clipPath: 'inset(0 100% 0 0)' },
          {
            clipPath: 'inset(0 0% 0 0)',
            duration: 1.3,
            ease: 'power3.inOut',
            scrollTrigger: { trigger: row, start: 'top 82%' },
          }
        )
      })

      // ── 5. Close section ──────────────────────────────────────────────────
      gsap.fromTo(
        '#close-content',
        { opacity: 0, y: 56 },
        {
          opacity: 1,
          y: 0,
          duration: 1.4,
          ease: 'power3.out',
          scrollTrigger: { trigger: '#book', start: 'top 68%' },
        }
      )
    })

    return () => ctx.revert()
  }, [ready])

  return (
    <>
      {/* Custom cursor — desktop only */}
      <Cursor />

      {/* Cinematic intro — covers everything until dismissed */}
      <IntroSequence onComplete={onIntroComplete} />

      {/* Fixed 3D canvas — always behind */}
      <Scene />

      {/*
       * Main content — starts invisible, fades in when intro ends.
       * CSS transition handles the cross-fade with the departing intro.
       */}
      <main
        className="min-h-screen text-white overflow-x-hidden transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Nav />

        {/* ══════════════════════════════════════════════════════════════════
            SCENE 1  —  Opening
            Transparent background so the 3D canvas bleeds through.
        ══════════════════════════════════════════════════════════════════ */}
        <section className="h-screen relative flex flex-col items-center justify-center overflow-hidden">

          {/* Animated swirl mark — behind the wordmark */}
          <div id="open-swirls" className="absolute inset-0 flex items-center justify-center opacity-0">
            <AnimatedSwirls className="w-[min(90vw,680px)] h-[min(90vw,680px)]" />
          </div>

          {/* Eyebrow */}
          <p
            id="open-label"
            className="relative z-10 section-label mb-10 opacity-0"
          >
            Est. 2024 &nbsp;·&nbsp; Exclusive Events
          </p>

          {/* Wordmark */}
          <h1
            id="open-h1"
            className="relative z-10 font-serif font-light uppercase text-center leading-[0.88] tracking-[0.1em] text-white opacity-0"
            style={{ fontSize: 'clamp(3.2rem, 10vw, 8rem)' }}
          >
            High Class<br />
            <em className="not-italic text-gold">Experience</em>
          </h1>

          {/* Scroll cue */}
          <div
            id="open-scroll"
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-0 pointer-events-none"
          >
            <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-white/25">
              Scroll
            </span>
            <div className="w-px h-14 bg-gradient-to-b from-gold/35 to-transparent" />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SCENE 2  —  Manifesto
            Pinned by GSAP. 3 text beats play through as the user scrolls.
            Beat 1 → Beat 2 → Beat 3 (stays).
        ══════════════════════════════════════════════════════════════════ */}
        <section
          id="manifesto"
          className="h-screen bg-black relative overflow-hidden"
        >
          {/* Beat 1 — "EXPECT THE" — left-aligned */}
          <div
            id="beat-1"
            className="absolute inset-0 flex flex-col justify-center px-10 md:px-20"
          >
            <p className="font-serif font-light uppercase text-white leading-none"
               style={{ fontSize: 'clamp(3.5rem, 11vw, 12rem)' }}>
              Expect
            </p>
            <p className="font-serif italic text-gold leading-none"
               style={{ fontSize: 'clamp(2rem, 6.5vw, 7rem)' }}>
              the
            </p>
          </div>

          {/* Beat 2 — "EXTRAORDINARY." — right-aligned, gold */}
          <div
            id="beat-2"
            className="absolute inset-0 flex flex-col justify-center items-end px-10 md:px-20"
          >
            <p
              className="font-serif font-light uppercase text-gold text-right leading-none"
              style={{ fontSize: 'clamp(2.4rem, 7vw, 9.5rem)' }}
            >
              Extra<br />ordinary.
            </p>
          </div>

          {/* Beat 3 — "NOTHING LESS." — centred, white */}
          <div
            id="beat-3"
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
          >
            <p
              className="font-serif font-light uppercase text-white/80 leading-none"
              style={{ fontSize: 'clamp(3rem, 9vw, 11rem)' }}
            >
              Nothing
            </p>
            <p
              className="font-serif italic text-white/50 leading-none"
              style={{ fontSize: 'clamp(2.5rem, 7.5vw, 9rem)' }}
            >
              less.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SCENE 3  —  Events Filmstrip
            Horizontal scroll pinned by GSAP. 3 full-screen panels.
            Each panel has a distinct typographic alignment.
        ══════════════════════════════════════════════════════════════════ */}
        <section
          id="events"
          className="h-screen bg-[#050505] relative overflow-hidden"
        >
          {/* The strip — 3 × 100vw, translated by GSAP */}
          <div className="filmstrip flex h-full will-change-transform">
            {EVENTS.map((ev) => (
              <div
                key={ev.id}
                className={`w-screen h-full flex-shrink-0 flex flex-col justify-between px-10 md:px-20 py-14 ${PANEL_ALIGN[ev.align]}`}
                style={{ borderRight: '1px solid rgba(212,175,55,0.06)' }}
              >
                {/* Panel header */}
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold/60">
                    {ev.index} — {ev.label}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/20">
                    {ev.date}
                  </span>
                </div>

                {/* Event title — massive serif */}
                <div className={`flex flex-col gap-1 ${ev.align === 'right' ? 'items-end' : ev.align === 'center' ? 'items-center' : 'items-start'}`}>
                  {ev.title.map((line, i) => (
                    <h3
                      key={i}
                      className="font-serif font-light uppercase text-white leading-none"
                      style={{ fontSize: 'clamp(3.5rem, 9.5vw, 11rem)' }}
                    >
                      {line}
                    </h3>
                  ))}
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/25 mt-6">
                    {ev.location}
                  </p>
                </div>

                {/* Panel footer */}
                <div className="flex items-end justify-between w-full">
                  <span className="font-serif text-3xl text-gold font-light">
                    {ev.price}
                  </span>
                  <button
                    onClick={() => startCheckout(ev.priceId)}
                    className="group flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-white/60 hover:text-gold transition-colors duration-400"
                  >
                    Book
                    <span className="inline-block w-8 h-px bg-current transition-all duration-400 group-hover:w-14" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Filmstrip progress — thin gold rule, grows from left */}
          <div className="absolute bottom-0 left-0 w-full h-px bg-white/5">
            <div
              id="film-progress"
              className="h-full bg-gold origin-left"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          {/* Panel count indicator */}
          <div className="absolute bottom-5 right-10 font-mono text-[9px] tracking-[0.25em] uppercase text-white/15">
            Scroll to explore
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SCENE 4  —  Services
            Full-width typographic rows. Each reveals with a
            left-to-right clip-path curtain wipe on scroll.
        ══════════════════════════════════════════════════════════════════ */}
        <section id="services" className="bg-black py-section px-10 md:px-20">

          {/* Section eyebrow */}
          <div className="flex items-center gap-6 mb-20">
            <span className="section-label">Our Services</span>
            <div className="hairline flex-1" />
          </div>

          {/* Service rows */}
          <div>
            {SERVICES.map((s) => (
              <div
                key={s.n}
                className="service-row group relative border-b border-gold/[0.07] py-8 md:py-10 cursor-default overflow-hidden"
                style={{ clipPath: 'inset(0 100% 0 0)' }}
              >
                <div className="flex items-baseline gap-6 md:gap-10">
                  {/* Faded index */}
                  <span className="font-mono text-[9px] tracking-[0.35em] text-gold/25 shrink-0">
                    {s.n}
                  </span>

                  {/* Service title — full width, huge */}
                  <h3
                    className="font-serif font-light uppercase text-white group-hover:text-gold transition-colors duration-500 leading-none"
                    style={{ fontSize: 'clamp(1.8rem, 4.5vw, 5.5rem)' }}
                  >
                    {s.title}
                  </h3>

                  {/* Arrow — slides right on hover */}
                  <span className="ml-auto font-mono text-white/20 group-hover:text-gold group-hover:translate-x-2 transition-all duration-400 shrink-0 hidden md:inline">
                    →
                  </span>
                </div>

                {/* Description — slides up from beneath on hover */}
                <p className="service-desc font-serif text-sm italic text-white/35 leading-relaxed max-w-xl ml-[3.5rem] md:ml-[4.5rem] mt-0 max-h-0 overflow-hidden group-hover:max-h-12 group-hover:mt-3 transition-all duration-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SCENE 5  —  The Close
            Spare. Intimate. One statement. One button.
            The contrast with the manifesto's screaming type is the point.
        ══════════════════════════════════════════════════════════════════ */}
        <section
          id="book"
          className="h-screen flex items-center justify-center px-8 bg-black"
        >
          <div id="close-content" className="text-center opacity-0">

            {/* Thin gold line above */}
            <div className="w-px h-16 bg-gradient-to-b from-transparent to-gold mx-auto mb-14" />

            <p
              className="font-serif italic font-light text-white leading-tight mb-3"
              style={{ fontSize: 'clamp(2.8rem, 7vw, 7rem)' }}
            >
              Your table
            </p>
            <p
              className="font-serif italic font-light text-gold leading-tight mb-16"
              style={{ fontSize: 'clamp(2.8rem, 7vw, 7rem)' }}
            >
              is waiting.
            </p>

            <button
              onClick={() => startCheckout('price_membership_2025')}
              className="btn-gold !text-[11px] !px-14 !py-5"
            >
              Request Invitation
            </button>

            {/* Thin gold line below */}
            <div className="w-px h-16 bg-gradient-to-b from-gold to-transparent mx-auto mt-14" />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════════ */}
        <footer
          id="contact"
          className="border-t border-gold/[0.07] px-10 md:px-20 py-16 bg-black"
        >
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12 md:gap-8 mb-16">
            <div>
              <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-white mb-4">
                High Class<br />Experience
              </p>
              <p className="font-serif text-sm text-white/25 italic leading-relaxed">
                Luxury events for<br />the discerning few.
              </p>
            </div>

            {[
              { heading: 'Events', links: ['Galas & Dinners', 'Racing Experiences', 'Cultural Events', 'Private Retreats'] },
              { heading: 'Services', links: ['Venue Curation', 'VIP Transport', 'Concierge', 'Bespoke Design'] },
              { heading: 'Company', links: ['About', 'Press', 'Membership', 'Contact'] },
            ].map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold/45 mb-5">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="font-serif text-sm text-white/25 hover:text-white/65 transition-colors duration-300 italic"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gold/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/15">
              © 2024 High Class Experience. All rights reserved.
            </p>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/15">
              Privacy · Terms · Cookies
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
