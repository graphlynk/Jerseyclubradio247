'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from '@/components/Nav'
import AnimatedSwirls from '@/components/AnimatedSwirls'

gsap.registerPlugin(ScrollTrigger)

// Dynamic import — Three.js must not run on the server
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false })

// ─── Data ───────────────────────────────────────────────────────────────────

const EVENTS = [
  {
    id: 'evt_001',
    label: 'Private Gala',
    title: 'The Obsidian Evening',
    date: 'December 14, 2024',
    location: 'Ritz Carlton Penthouse · New York',
    description:
      'An intimate evening of curated fine dining, live jazz, and a private art exhibition for 40 discerning guests.',
    price: '$2,400',
    priceId: 'price_obsidian_evening',
  },
  {
    id: 'evt_002',
    label: 'VIP Weekend',
    title: 'Monaco Grand Circuit',
    date: 'January 18–20, 2025',
    location: 'Circuit de Monaco · Monte Carlo',
    description:
      'Three days of trackside access, Champagne suites, and exclusive paddock hospitality at the most iconic race in the world.',
    price: '$8,800',
    priceId: 'price_monaco_circuit',
  },
  {
    id: 'evt_003',
    label: 'Members Only',
    title: 'Midnight at Versailles',
    date: 'February 8, 2025',
    location: 'Château de Versailles · Paris',
    description:
      'After-hours private access to the Palace of Versailles, followed by a Champagne reception in the Hall of Mirrors.',
    price: '$5,600',
    priceId: 'price_versailles',
  },
]

const SERVICES = [
  {
    label: '01',
    title: 'Private Venue Curation',
    description:
      'Access to the world's most exclusive venues — Michelin-starred private dining rooms, historic palaces, and estates otherwise closed to the public.',
  },
  {
    label: '02',
    title: 'VIP Transportation',
    description:
      'Rolls-Royce ground transfers, private jet arrangements, and superyacht charters tailored to your precise itinerary.',
  },
  {
    label: '03',
    title: 'White Glove Concierge',
    description:
      '24/7 dedicated concierge handling every detail before, during, and after your experience — anticipating needs before they arise.',
  },
  {
    label: '04',
    title: 'Bespoke Event Design',
    description:
      'Custom florals, ambient production, private performers, and curated menus designed exclusively around your vision.',
  },
]

// ─── Checkout helper ─────────────────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Hero entrance — staggered fade-up with slight skew ──────────────
      gsap.fromTo(
        '.hero-reveal',
        { y: 72, opacity: 0, skewY: 1.5 },
        {
          y: 0,
          opacity: 1,
          skewY: 0,
          stagger: 0.18,
          duration: 1.5,
          ease: 'power4.out',
          delay: 0.7,
        }
      )

      // ── Events section ──────────────────────────────────────────────────
      gsap.fromTo(
        '.event-reveal',
        { y: 56, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.14,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '#events',
            start: 'top 72%',
          },
        }
      )

      // ── Services section ────────────────────────────────────────────────
      gsap.fromTo(
        '.service-reveal',
        { y: 44, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '#services',
            start: 'top 72%',
          },
        }
      )

      // ── Booking CTA ─────────────────────────────────────────────────────
      gsap.fromTo(
        '.cta-reveal',
        { y: 44, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.18,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '#book',
            start: 'top 76%',
          },
        }
      )
    })

    return () => ctx.revert()
  }, [])

  return (
    // Transparent main — the fixed canvas shows through everywhere
    <main className="min-h-screen text-white overflow-x-hidden">
      <Scene />

      <div className="relative z-10">
        <Nav />

        {/* ════════════════════════════════════════════════
            HERO — full viewport, centered
        ════════════════════════════════════════════════ */}
        <section className="h-screen flex flex-col items-center justify-center px-8 text-center">
          <p className="hero-reveal section-label mb-10">
            Exclusive Events &nbsp;·&nbsp; Members Only
          </p>

          {/*
           * Logo mark: animated swirls orbit behind the stacked wordmark.
           * The SVG uses overflow:visible so the ellipses extend beyond the
           * container without clipping. The negative margin pulls the swirl
           * cloud flush with the text on all sides.
           */}
          <div className="hero-reveal relative flex items-center justify-center mb-10"
               style={{ minHeight: 'clamp(12rem, 28vw, 22rem)' }}
          >
            {/* Animated oval flourishes — gold, behind the text */}
            <AnimatedSwirls className="absolute inset-0 w-full h-full" />

            {/* Wordmark — sits above the swirls */}
            <h1
              className="relative z-10 font-serif font-light uppercase leading-[0.88] tracking-[0.1em] text-white"
              style={{ fontSize: 'clamp(3.2rem, 10vw, 7.5rem)' }}
            >
              High Class<br />
              <em className="not-italic text-gold">Experience</em>
            </h1>
          </div>

          <p className="hero-reveal font-serif text-base md:text-lg text-white/45 leading-relaxed max-w-sm mx-auto mb-14 italic">
            Curated luxury events crafted for those who demand
            nothing less than extraordinary.
          </p>

          <div className="hero-reveal flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#book" className="btn-gold">Book Your Experience</a>
            <a href="#events" className="btn-ghost">Discover Events</a>
          </div>

          {/* Scroll indicator */}
          <div className="hero-reveal absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none">
            <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-white/25">
              Scroll
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-gold/40 to-transparent" />
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            EVENTS — glass cards over receding 3D scene
        ════════════════════════════════════════════════ */}
        <section id="events" className="py-section px-8 md:px-16">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="event-reveal flex items-center gap-6 mb-20">
              <span className="section-label">Upcoming Events</span>
              <div className="hairline flex-1" />
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/20">
                2024–2025
              </span>
            </div>

            {/* Event cards grid */}
            <div className="grid md:grid-cols-3 gap-5">
              {EVENTS.map((event) => (
                <article
                  key={event.id}
                  className="event-reveal glass-panel p-8 flex flex-col gap-6"
                >
                  <div className="flex-1">
                    <p className="section-label mb-5">{event.label}</p>

                    <h3 className="font-serif text-[1.6rem] font-light uppercase tracking-[0.07em] text-white leading-tight mb-4">
                      {event.title}
                    </h3>

                    <div className="space-y-1 mb-6">
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold/80">
                        {event.date}
                      </p>
                      <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-white/25">
                        {event.location}
                      </p>
                    </div>

                    <p className="font-serif text-sm text-white/45 leading-relaxed italic">
                      {event.description}
                    </p>
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-6 border-t border-gold/[0.1]">
                    <span className="font-serif text-2xl text-gold font-light">
                      {event.price}
                    </span>
                    <button
                      onClick={() => startCheckout(event.priceId)}
                      className="btn-gold !text-[10px] !px-6 !py-3"
                    >
                      Book Now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SERVICES — grid with gold hairline dividers
        ════════════════════════════════════════════════ */}
        <section id="services" className="py-section px-8 md:px-16">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="service-reveal flex items-center gap-6 mb-20">
              <span className="section-label">Our Services</span>
              <div className="hairline flex-1" />
            </div>

            {/* 2×2 grid — cells separated by 1px gold hairlines */}
            <div className="grid md:grid-cols-2 gap-px bg-gold/[0.07]">
              {SERVICES.map((service) => (
                <div
                  key={service.label}
                  className="service-reveal bg-black/80 p-10 md:p-14"
                  style={{ backdropFilter: 'blur(8px)' }}
                >
                  <p className="font-mono text-[10px] tracking-[0.35em] text-gold/35 mb-7">
                    {service.label}
                  </p>
                  <h3 className="font-serif text-2xl md:text-[1.75rem] font-light uppercase tracking-[0.07em] text-white mb-5 leading-tight">
                    {service.title}
                  </h3>
                  <p className="font-serif text-sm md:text-base text-white/40 leading-relaxed italic">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            BOOKING CTA — centred pre-footer band
        ════════════════════════════════════════════════ */}
        <section id="book" className="py-section px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <p className="cta-reveal section-label mb-10">Reserve Your Place</p>

            <h2
              className="cta-reveal font-serif font-light uppercase tracking-[0.09em] leading-[0.95] text-white mb-10"
              style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}
            >
              Experience the<br />
              <em className="not-italic text-gold">Extraordinary</em>
            </h2>

            <p className="cta-reveal font-serif text-base text-white/35 italic leading-relaxed max-w-sm mx-auto mb-14">
              A limited number of memberships are available for the 2025 season.
              Request your personal invitation today.
            </p>

            <div className="cta-reveal flex flex-col sm:flex-row gap-5 justify-center">
              <button
                onClick={() => startCheckout('price_membership_2025')}
                className="btn-gold !text-[11px] !px-12 !py-5"
              >
                Request Invitation
              </button>
              <a
                href="mailto:hello@highclassexperience.com"
                className="btn-ghost !text-[11px] !px-12 !py-5"
              >
                Enquire Directly
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════ */}
        <footer
          id="contact"
          className="border-t border-gold/[0.07] px-8 md:px-16 py-16 bg-black/90"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12 md:gap-8 mb-16">
            {/* Brand column */}
            <div>
              <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-white mb-4">
                High Class<br />Experience
              </p>
              <p className="font-serif text-sm text-white/25 italic leading-relaxed">
                Luxury events for<br />the discerning few.
              </p>
            </div>

            {/* Link columns */}
            {[
              {
                heading: 'Events',
                links: ['Galas & Dinners', 'Racing Experiences', 'Cultural Events', 'Private Retreats'],
              },
              {
                heading: 'Services',
                links: ['Venue Curation', 'VIP Transport', 'Concierge', 'Bespoke Design'],
              },
              {
                heading: 'Company',
                links: ['About', 'Press', 'Membership', 'Contact'],
              },
            ].map((col) => (
              <div key={col.heading}>
                <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold/50 mb-5">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="font-serif text-sm text-white/25 hover:text-white/60 transition-colors duration-300 italic"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gold/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/15">
              © 2024 High Class Experience. All rights reserved.
            </p>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/15">
              Privacy · Terms · Cookies
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
