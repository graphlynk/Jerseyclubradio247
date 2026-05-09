'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({
      delay: 0.3,
      onComplete: () =>
        gsap.to(wrap.current, {
          opacity: 0,
          duration: 0.65,
          ease: 'power2.inOut',
          onComplete,
        }),
    })

    tl
      // Both hairlines draw outward from centre simultaneously
      .fromTo(
        '#il-left',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.1, ease: 'expo.inOut', transformOrigin: '100% 50%' }
      )
      .fromTo(
        '#il-right',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.1, ease: 'expo.inOut', transformOrigin: '0% 50%' },
        '<'
      )
      // Invitation text expands into place from compressed letterSpacing
      .fromTo(
        '#il-text',
        { opacity: 0, letterSpacing: '1.8em' },
        { opacity: 1, letterSpacing: '0.42em', duration: 0.9, ease: 'power2.out' },
        '-=0.35'
      )
      // Hold the moment
      .to({}, { duration: 1.5 })
      // Text retreats — letter spacing widens to nothing
      .to('#il-text', {
        opacity: 0,
        letterSpacing: '2.4em',
        duration: 0.55,
        ease: 'power2.in',
      })
      // Lines snap back inward
      .to(
        ['#il-left', '#il-right'],
        {
          scaleX: 0,
          duration: 0.4,
          ease: 'power2.in',
          stagger: 0,
        },
        '-=0.28'
      )

    return () => tl.kill()
  }, [onComplete])

  return (
    <div
      ref={wrap}
      className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
    >
      <div className="flex items-center w-full max-w-lg px-10 gap-0">
        <div
          id="il-left"
          className="flex-1 h-px bg-gold"
          style={{ transformOrigin: '100% 50%', transform: 'scaleX(0)' }}
        />
        <p
          id="il-text"
          className="font-mono text-[10px] uppercase text-gold shrink-0 px-5 opacity-0 whitespace-nowrap"
          style={{ letterSpacing: '1.8em' }}
        >
          You Were Invited
        </p>
        <div
          id="il-right"
          className="flex-1 h-px bg-gold"
          style={{ transformOrigin: '0% 50%', transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
}
