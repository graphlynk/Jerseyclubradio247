export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center px-8 text-center">
      {/* Thin gold line above */}
      <div className="w-px h-16 bg-gradient-to-b from-transparent to-gold mb-12" />

      <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-gold mb-8">
        Reservation Confirmed
      </p>

      <h1
        className="font-serif font-light uppercase tracking-[0.1em] text-white mb-8 leading-tight"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
      >
        Thank You for<br />
        <em className="not-italic text-gold">Your Trust</em>
      </h1>

      <p className="font-serif text-base text-white/40 italic leading-relaxed max-w-sm mb-14">
        Our concierge team will reach out within 24 hours to confirm every detail
        of your experience personally.
      </p>

      <a
        href="/"
        className="inline-flex items-center justify-center font-mono text-[11px] tracking-[0.25em] uppercase px-10 py-4 rounded-full border border-gold text-gold transition-all duration-500 hover:bg-gold hover:text-black"
      >
        Return Home
      </a>

      {/* Thin gold line below */}
      <div className="w-px h-16 bg-gradient-to-b from-gold to-transparent mt-12" />
    </main>
  )
}
