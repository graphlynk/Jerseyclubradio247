'use client'

/**
 * Scene.tsx — React Three Fiber 3D hero canvas
 *
 * Architecture:
 *  - Canvas is position:fixed, z-index:0, pointer-events:none
 *    → always renders behind page content; page scroll is never blocked
 *  - `camTarget` is a plain module-level object mutated by GSAP ScrollTrigger
 *    → useFrame lerps the actual Three.js camera toward camTarget each frame
 *  - Mouse position is tracked on the window and applied via useFrame lerp
 *    → simulates PresentationControls without blocking scroll
 */

import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float } from '@react-three/drei'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

gsap.registerPlugin(ScrollTrigger)

// Plain object mutated by GSAP — never stored in React state
const camTarget = { posZ: 5, posY: 0 }

// ─────────────────────────────────────────────
// Inner component — has access to R3F context
// ─────────────────────────────────────────────
function SceneContent() {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Track mouse for subtle parallax rotation
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    const ctx = gsap.context(() => {
      // Phase 1: camera pulls back as events section scrolls into view
      // The torus shrinks into a cinematic background element
      gsap.to(camTarget, {
        posZ: 10,
        posY: -1.5,
        ease: 'none',
        scrollTrigger: {
          trigger: '#events',
          start: 'top bottom',
          end: 'top top',
          scrub: 2,
        },
      })

      // Phase 2: camera drifts further back through services section
      gsap.to(camTarget, {
        posZ: 16,
        posY: -3.5,
        ease: 'none',
        scrollTrigger: {
          trigger: '#services',
          start: 'top bottom',
          end: 'top top',
          scrub: 2,
        },
      })
    })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      ctx.revert()
    }
  }, [])

  useFrame((_, delta) => {
    // Lerp camera toward GSAP-animated targets — smooth, never jittery
    camera.position.z += (camTarget.posZ - camera.position.z) * 0.06
    camera.position.y += (camTarget.posY - camera.position.y) * 0.06

    if (!groupRef.current) return

    // Slow continuous rotation around Z axis
    groupRef.current.rotation.z += delta * 0.07

    // Mouse-driven parallax — X and Y axes
    groupRef.current.rotation.y +=
      (mouse.current.x * 0.45 - groupRef.current.rotation.y) * 0.04
    groupRef.current.rotation.x +=
      (-mouse.current.y * 0.3 - groupRef.current.rotation.x) * 0.04
  })

  return (
    <>
      {/* Ambient fill */}
      <ambientLight intensity={0.1} />

      {/* Gold key light — gives the torus its signature warm highlight */}
      <pointLight position={[6, 6, 6]} intensity={4} color="#D4AF37" />

      {/* White fill from opposite side — keeps shadows from going pure black */}
      <pointLight position={[-8, -4, 5]} intensity={2} color="#ffffff" />

      {/* Warm rim light from below — adds depth */}
      <pointLight position={[0, -8, -4]} intensity={1.2} color="#C9A227" />

      {/* HDR environment for metallic reflections */}
      <Environment preset="studio" />

      <group ref={groupRef}>
        {/* ── Primary torus — polished metallic gold ── */}
        <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
          <mesh>
            <torusGeometry args={[1.35, 0.44, 128, 256]} />
            <meshPhysicalMaterial
              color="#D4AF37"
              metalness={1}
              roughness={0.035}
              reflectivity={1}
              clearcoat={1}
              clearcoatRoughness={0.03}
              envMapIntensity={3.5}
            />
          </mesh>
        </Float>

        {/* ── Inner orbital ring — white/silver, slightly tilted ── */}
        <Float speed={2.2} rotationIntensity={0.25} floatIntensity={0.2}>
          <mesh rotation={[Math.PI / 2.8, 0.4, 0]}>
            <torusGeometry args={[0.82, 0.055, 64, 256]} />
            <meshPhysicalMaterial
              color="#e8e8e8"
              metalness={0.95}
              roughness={0.06}
              envMapIntensity={2.5}
              transparent
              opacity={0.7}
            />
          </mesh>
        </Float>

        {/* ── Outer ghost ring — very thin, barely visible ── */}
        <Float speed={0.9} rotationIntensity={0.1} floatIntensity={0.15}>
          <mesh rotation={[0.6, 0, Math.PI / 5]}>
            <torusGeometry args={[2.1, 0.018, 32, 256]} />
            <meshPhysicalMaterial
              color="#D4AF37"
              metalness={1}
              roughness={0.1}
              envMapIntensity={2}
              transparent
              opacity={0.25}
            />
          </mesh>
        </Float>
      </group>
    </>
  )
}

// ─────────────────────────────────────────────
// Exported canvas wrapper
// ─────────────────────────────────────────────
export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 42 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none', // page scroll & clicks pass through
      }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]} // cap pixel ratio for performance
    >
      <SceneContent />
    </Canvas>
  )
}
