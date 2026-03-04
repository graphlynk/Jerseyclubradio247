import React, { useMemo, useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { motion, AnimatePresence } from 'motion/react';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export interface MapDot {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  visits?: number;
}

interface WorldHeatMapProps {
  visitors: MapDot[];
  active: MapDot[];
  /** Admin-only: show total visitor + live listener badges */
  showMetrics?: boolean;
}

// Country name → ISO 3166-1 numeric code (matches geo.id in world-atlas TopoJSON)
const COUNTRY_ISO: Record<string, string> = {
  'United States': '840', 'Canada': '124', 'Mexico': '484',
  'United Kingdom': '826', 'France': '250', 'Germany': '276',
  'Italy': '380', 'Spain': '724', 'Portugal': '620',
  'Netherlands': '528', 'Belgium': '56', 'Switzerland': '756',
  'Austria': '40', 'Sweden': '752', 'Norway': '578',
  'Denmark': '208', 'Finland': '246', 'Ireland': '372',
  'Poland': '616', 'Czech Republic': '203', 'Slovakia': '703',
  'Hungary': '348', 'Romania': '642', 'Bulgaria': '100',
  'Greece': '300', 'Turkey': '792', 'Russia': '643',
  'Ukraine': '804', 'Belarus': '112', 'Serbia': '688',
  'Croatia': '191', 'Bosnia and Herzegovina': '70', 'Slovenia': '705',
  'Albania': '8', 'North Macedonia': '807', 'Moldova': '498',
  'Lithuania': '440', 'Latvia': '428', 'Estonia': '233',
  'Jamaica': '388', 'Trinidad and Tobago': '780', 'Barbados': '52',
  'Bahamas': '44', 'Cuba': '192', 'Haiti': '332',
  'Dominican Republic': '214', 'Puerto Rico': '630',
  'Guyana': '328', 'Suriname': '740',
  'Brazil': '76', 'Colombia': '170', 'Venezuela': '862',
  'Argentina': '32', 'Peru': '604', 'Chile': '152',
  'Bolivia': '68', 'Ecuador': '218', 'Uruguay': '858',
  'Paraguay': '600', 'Panama': '591', 'Costa Rica': '188',
  'Guatemala': '320', 'El Salvador': '222', 'Honduras': '340',
  'Nicaragua': '558', 'Belize': '84',
  'Nigeria': '566', 'Ghana': '288', 'Ivory Coast': '384',
  'Senegal': '686', 'Kenya': '404', 'Tanzania': '834',
  'Uganda': '800', 'South Africa': '710', 'Egypt': '818',
  'Morocco': '504', 'Algeria': '12', 'Tunisia': '788',
  'Ethiopia': '231', 'Angola': '24', 'Cameroon': '120',
  'Zambia': '894', 'Zimbabwe': '716', 'Mozambique': '508',
  'Rwanda': '646', 'Mali': '466', 'Burkina Faso': '854',
  'Niger': '562', 'Chad': '148', 'Sudan': '729',
  'Saudi Arabia': '682', 'United Arab Emirates': '784',
  'Qatar': '634', 'Kuwait': '414', 'Bahrain': '48',
  'Israel': '376', 'Jordan': '400', 'Lebanon': '422',
  'Iraq': '368', 'Iran': '364', 'Syria': '760',
  'India': '356', 'Pakistan': '586', 'Bangladesh': '50',
  'Sri Lanka': '144', 'Nepal': '524', 'Afghanistan': '4',
  'China': '156', 'Japan': '392', 'South Korea': '410',
  'North Korea': '408', 'Mongolia': '496', 'Taiwan': '158',
  'Singapore': '702', 'Malaysia': '458', 'Indonesia': '360',
  'Philippines': '608', 'Vietnam': '704', 'Thailand': '764',
  'Myanmar': '104', 'Cambodia': '116', 'Laos': '418',
  'Australia': '36', 'New Zealand': '554',
  'Papua New Guinea': '598', 'Fiji': '242',
  'Kazakhstan': '398', 'Uzbekistan': '860', 'Turkmenistan': '795',
  'Kyrgyzstan': '417', 'Tajikistan': '762',
};

const ISO_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_ISO).map(([name, iso]) => [iso, name])
);

// ── Smooth log-scale heat color interpolation ─────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

// 8-stop gradient: void → faint indigo → electric purple → neon violet → hot magenta → scorching
const HEAT_STOPS = [
  { t: 0,    hex: '#111030' }, // unvisited landmass — visible navy-slate
  { t: 0.10, hex: '#1E0870' },
  { t: 0.25, hex: '#3A0E9A' },
  { t: 0.42, hex: '#5512C8' },
  { t: 0.60, hex: '#9D00FF' },
  { t: 0.74, hex: '#D030FF' },
  { t: 0.87, hex: '#FF1888' },
  { t: 1.00, hex: '#FF5028' },
];

/** Map visit count → [0, 1] on a log scale (200 visits = max heat) */
function getHeatT(visits: number): number {
  if (visits <= 0) return 0;
  return Math.min(Math.log(visits + 1) / Math.log(201), 1);
}

function interpolateStops(t: number, stops: { t: number; hex: string }[]): string {
  if (t <= stops[0].t) return stops[0].hex;
  if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].hex;
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const s = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      const [ar, ag, ab] = hexToRgb(stops[i].hex);
      const [br, bg, bb] = hexToRgb(stops[i + 1].hex);
      return rgbToHex(lerp(ar, br, s), lerp(ag, bg, s), lerp(ab, bb, s));
    }
  }
  return stops[stops.length - 1].hex;
}

function getHeatColor(visits: number): string {
  return interpolateStops(getHeatT(visits), HEAT_STOPS);
}

function getHeatColorBrighter(visits: number): string {
  return interpolateStops(Math.min(getHeatT(visits) + 0.18, 1), HEAT_STOPS);
}

function getHeatColorHover(visits: number): string {
  return interpolateStops(Math.min(getHeatT(visits) + 0.28, 1), HEAT_STOPS);
}

function getGlowFilter(visits: number): string | undefined {
  const t = getHeatT(visits);
  if (t >= 0.74) return 'url(#bloom-hot)';
  if (t >= 0.42) return 'url(#bloom-mid)';
  if (t >= 0.10) return 'url(#bloom-low)';
  return undefined;
}

function getHeatLabel(visits: number): string {
  const t = getHeatT(visits);
  if (t <= 0)   return '';
  if (t < 0.25) return 'Emerging';
  if (t < 0.50) return 'Active';
  if (t < 0.72) return 'Hot';
  if (t < 0.87) return 'Blazing';
  return 'Scorching';
}

function getHeatLabelColor(visits: number): string {
  const t = getHeatT(visits);
  if (t < 0.25) return '#6B4FBF';
  if (t < 0.50) return '#9D7FFF';
  if (t < 0.72) return '#C84FFF';
  if (t < 0.87) return '#FF40C0';
  return '#FF7040';
}

// ── Country tooltip ────────────────────────────────────────────────────────────
function CountryTooltip({
  country, visits, x, y, totalVisitors,
}: {
  country: string;
  visits: number;
  x: number;
  y: number;
  totalVisitors: number;
}) {
  const pct = totalVisitors > 0 ? ((visits / totalVisitors) * 100).toFixed(1) : '0.0';
  const label = getHeatLabel(visits);
  const labelColor = getHeatLabelColor(visits);
  const heatT = getHeatT(visits);

  return ReactDOM.createPortal(
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="pointer-events-none fixed z-[9999]"
      style={{ left: x, top: y - 14, transform: 'translate(-50%, -100%)' }}
    >
      <div style={{
        background: 'rgba(5,0,18,0.97)',
        border: '1px solid rgba(157,0,255,0.35)',
        borderRadius: 12,
        padding: '10px 14px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(120,0,255,0.35), 0 2px 8px rgba(0,0,0,0.6)',
        minWidth: 140,
      }}>
        {/* Country name */}
        <p style={{
          fontSize: 12, fontWeight: 800, color: '#fff', margin: 0, marginBottom: 6,
          fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em',
        }}>
          {country}
        </p>

        {/* Heat bar */}
        <div style={{ marginBottom: 6 }}>
          <div style={{
            height: 3, borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round(heatT * 100)}%`,
              background: `linear-gradient(to right, #5512C8, ${getHeatColor(visits)})`,
              borderRadius: 2,
              boxShadow: `0 0 6px ${getHeatColor(visits)}80`,
            }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 10, color: '#9D7FFF', fontFamily: 'system-ui, sans-serif' }}>
            {visits.toLocaleString()} {visits === 1 ? 'visit' : 'visits'}
          </span>
          {pct !== '0.0' && (
            <span style={{ fontSize: 10, color: '#5B4F70', fontFamily: 'system-ui, sans-serif' }}>
              {pct}% of total
            </span>
          )}
        </div>

        {/* Heat label */}
        {label && (
          <p style={{
            fontSize: 9, fontWeight: 900, color: labelColor, margin: '5px 0 0',
            fontFamily: 'system-ui, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ▲ {label}
          </p>
        )}
      </div>
      {/* Caret */}
      <div style={{
        width: 0, height: 0, margin: '0 auto',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid rgba(5,0,18,0.97)',
      }} />
    </motion.div>,
    document.body
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WorldHeatMap({ visitors, active, showMetrics = false }: WorldHeatMapProps) {
  const [tooltip, setTooltip] = useState<{
    country: string; visits: number; x: number; y: number;
  } | null>(null);
  const [zoomConfig, setZoomConfig] = useState({
    coordinates: [10, 10] as [number, number],
    zoom: 1,
  });

  const countryVisitMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of visitors) {
      if (!v.country || v.country === 'Unknown') continue;
      const iso = COUNTRY_ISO[v.country];
      if (iso) m.set(iso, (m.get(iso) ?? 0) + (v.visits ?? 1));
    }
    return m;
  }, [visitors]);

  const totalVisitors = useMemo(
    () => visitors.reduce((sum, v) => sum + (v.visits ?? 1), 0),
    [visitors]
  );

  const handleGeoEnter = useCallback((e: React.MouseEvent, iso: string, visits: number) => {
    if (visits === 0) return;
    const country = ISO_TO_COUNTRY[iso] ?? 'Unknown';
    setTooltip({ country, visits, x: e.clientX, y: e.clientY });
  }, []);

  const handleGeoMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleGeoLeave = useCallback(() => setTooltip(null), []);

  const handleZoomEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
    setZoomConfig(pos);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoomConfig({ coordinates: [10, 10], zoom: 1 });
  }, []);

  return (
    <div
      className="w-full relative rounded-xl overflow-hidden select-none"
      style={{ aspectRatio: '2 / 1', background: '#05020F' }}
      onDoubleClick={handleDoubleClick}
    >
      {/* ── Deep space atmosphere ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(80,20,180,0.12) 0%, transparent 70%)',
          'radial-gradient(ellipse 40% 35% at 25% 70%, rgba(157,0,255,0.07) 0%, transparent 60%)',
          'radial-gradient(ellipse 35% 30% at 75% 30%, rgba(255,24,136,0.05) 0%, transparent 60%)',
        ].join(', '),
      }} />

      {/* ── Vignette ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 95% 85% at 50% 50%, transparent 48%, #05020F 100%)',
      }} />

      {/* ── Fine scanline CRT overlay ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)',
      }} />

      {/* ── Faint coordinate grid ─── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.018,
        backgroundImage: `
          repeating-linear-gradient(0deg, #9D00FF 0px, #9D00FF 1px, transparent 1px, transparent 55px),
          repeating-linear-gradient(90deg, #9D00FF 0px, #9D00FF 1px, transparent 1px, transparent 55px)
        `,
      }} />

      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 148, center: [10, 10] }}
        style={{ width: '100%', height: '100%', display: 'block', position: 'relative', zIndex: 2 }}
      >
        <ZoomableGroup
          center={zoomConfig.coordinates}
          zoom={zoomConfig.zoom}
          onMoveEnd={handleZoomEnd}
          maxZoom={5}
          minZoom={1}
        >
          {/* ── SVG filter definitions ────────────────────────────────────── */}
          <defs>
            {/* Low heat: subtle inner glow */}
            <filter id="bloom-low" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Mid heat: dual-layer glow */}
            <filter id="bloom-mid" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="outerBlur" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="innerBlur" />
              <feMerge>
                <feMergeNode in="outerBlur" />
                <feMergeNode in="innerBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hot: intense triple-layer bloom */}
            <filter id="bloom-hot" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="bigBlur" />
              <feColorMatrix in="bigBlur" type="matrix"
                values="1.4 0 0 0 0  0 0.2 0 0 0  0 0 1.8 0 0  0 0 0 28 -6"
                result="tinted" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="midBlur" />
              <feMerge>
                <feMergeNode in="tinted" />
                <feMergeNode in="midBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Active listener sonar glow */}
            <filter id="sonar-glow" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="5" result="g1" />
              <feGaussianBlur stdDeviation="2" result="g2" />
              <feMerge>
                <feMergeNode in="g1" />
                <feMergeNode in="g2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radar sweep gradient */}
            <linearGradient id="sweep-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="#9D00FF" stopOpacity="0" />
              <stop offset="20%"  stopColor="#9D00FF" stopOpacity="0.07" />
              <stop offset="60%"  stopColor="#FF1888" stopOpacity="0.18" />
              <stop offset="85%"  stopColor="#FF40C0" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FF1888" stopOpacity="0" />
            </linearGradient>

            {/* Aurora band gradient */}
            <linearGradient id="aurora-grad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stopColor="#00FFFF" stopOpacity="0" />
              <stop offset="20%"  stopColor="#9D00FF" stopOpacity="0.25" />
              <stop offset="45%"  stopColor="#FF00AA" stopOpacity="0.35" />
              <stop offset="70%"  stopColor="#00AAFF" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#00FFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── Country fills ──────────────────────────────────────────────── */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) => (
              <>
                {geographies.map((geo, i) => {
                  const iso = String(geo.id);
                  const visits = countryVisitMap.get(iso) ?? 0;
                  const hasVisitors = visits > 0;
                  const fillColor = getHeatColor(visits);
                  const strokeColor = hasVisitors ? getHeatColorBrighter(visits) : '#1C1650';
                  const glowFilter = getGlowFilter(visits);

                  return (
                    <motion.g
                      key={geo.rsmKey}
                      initial={{ opacity: 0 }}
                      animate={hasVisitors
                        ? { opacity: [0, 1, 0.88, 1] }
                        : { opacity: 1 }
                      }
                      transition={hasVisitors
                        ? {
                            duration: 3.5,
                            delay: (i * 0.005) % 1.0,
                            repeat: Infinity,
                            repeatDelay: 8 + (i % 4),
                            ease: 'easeInOut',
                          }
                        : {
                            duration: 0.6,
                            delay: (i * 0.003) % 0.4,
                          }
                      }
                    >
                      <Geography
                        geography={geo}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={hasVisitors ? 0.45 : 0.25}
                        filter={glowFilter}
                        style={{
                          default: { outline: 'none' },
                          hover: {
                            outline: 'none',
                            fill: hasVisitors ? getHeatColorHover(visits) : '#1E1560',
                            cursor: hasVisitors ? 'crosshair' : 'default',
                          },
                          pressed: { outline: 'none' },
                        }}
                        onMouseEnter={(e: any) => handleGeoEnter(e, iso, visits)}
                        onMouseMove={(e: any) => { if (hasVisitors) handleGeoMove(e); }}
                        onMouseLeave={handleGeoLeave}
                      />
                    </motion.g>
                  );
                })}

                {/* ── Radar sweep ──────────────────────────────────────────── */}
                <motion.g
                  initial={{ x: -900 }}
                  animate={{ x: 900 }}
                  transition={{ duration: 7, ease: 'linear', repeat: Infinity, repeatDelay: 11 }}
                  style={{ pointerEvents: 'none' }}
                >
                  <rect x={-140} y={-500} width={280} height={1000} fill="url(#sweep-grad)" />
                  {/* Sharp leading edge */}
                  <rect x={-1} y={-500} width={2} height={1000}
                    fill="rgba(255,200,255,0.12)" />
                </motion.g>

                {/* ── Slow aurora band ─────────────────────────────────────── */}
                <motion.rect
                  x={-900} y={0} width={1800} height={120}
                  fill="url(#aurora-grad)"
                  opacity={0.06}
                  style={{ pointerEvents: 'none' }}
                  animate={{ y: [-80, 220, -80], opacity: [0.04, 0.09, 0.04] }}
                  transition={{ duration: 22, ease: 'easeInOut', repeat: Infinity }}
                />
              </>
            )}
          </Geographies>

          {/* ── Active listener sonar dots ────────────────────────────────── */}
          {active.map((dot, i) => (
            <Marker key={`a_${i}`} coordinates={[dot.lon, dot.lat]}>
              {/* Ring 4: outermost, slowest */}
              <motion.circle
                r={2} fill="none" stroke="#00FF88" strokeWidth={0.25}
                animate={{ r: [2, 24], opacity: [0.45, 0] }}
                transition={{ repeat: Infinity, duration: 4.0, ease: 'easeOut', delay: i * 0.28 }}
              />
              {/* Ring 3 */}
              <motion.circle
                r={2} fill="none" stroke="#40FFCC" strokeWidth={0.35}
                animate={{ r: [2, 17], opacity: [0.55, 0] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeOut', delay: i * 0.28 + 0.5 }}
              />
              {/* Ring 2 */}
              <motion.circle
                r={2} fill="none" stroke="#00FF88" strokeWidth={0.5}
                animate={{ r: [2, 11], opacity: [0.65, 0] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeOut', delay: i * 0.28 + 1.0 }}
              />
              {/* Ring 1: fastest */}
              <motion.circle
                r={2} fill="none" stroke="#AAFFEE" strokeWidth={0.7}
                animate={{ r: [2, 6], opacity: [0.85, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut', delay: i * 0.28 + 1.5 }}
              />
              {/* Core dot with bloom */}
              <motion.circle
                r={2.8} fill="#00FF88" filter="url(#sonar-glow)"
                animate={{ fillOpacity: [1, 0.6, 1], r: [2.8, 3.2, 2.8] }}
                transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.28 }}
              />
              {/* Bright center pinpoint */}
              <circle r={1.1} fill="rgba(255,255,255,0.9)" />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* ── Tooltip ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {tooltip && (
          <CountryTooltip
            country={tooltip.country}
            visits={tooltip.visits}
            x={tooltip.x}
            y={tooltip.y}
            totalVisitors={totalVisitors}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom-left: admin-only metrics badges ────────────────────────── */}
      {showMetrics && (
        <div style={{
          position: 'absolute', bottom: 12, left: 14, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 7,
          pointerEvents: 'none',
        }}>
          {totalVisitors > 0 && (
            <div style={{
              background: 'rgba(4,0,18,0.88)',
              border: '1px solid rgba(157,0,255,0.3)',
              borderRadius: 20,
              padding: '4px 10px',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: '0 2px 12px rgba(157,0,255,0.2)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'linear-gradient(135deg, #9D00FF, #D030FF)',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: '#C080FF', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
                {totalVisitors.toLocaleString()} {totalVisitors === 1 ? 'visitor' : 'visitors'}
              </span>
            </div>
          )}
          {active.length > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.55, 1] }}
              transition={{ repeat: Infinity, duration: 2.2 }}
              style={{
                background: 'rgba(4,0,18,0.88)',
                border: '1px solid rgba(0,255,136,0.3)',
                borderRadius: 20,
                padding: '4px 10px',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 12px rgba(0,255,136,0.15)',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF88', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#00FF88', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>
                {active.length} live now
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Bottom-right: heat legend (always visible) ────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 12, right: 14, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 8, color: '#3B2F60', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.08em' }}>
          FEW
        </span>
        <div style={{
          width: 52, height: 5, borderRadius: 3,
          background: 'linear-gradient(to right, #0D0045, #5512C8, #9D00FF, #D030FF, #FF1888)',
          boxShadow: '0 0 6px rgba(157,0,255,0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
        }} />
        <span style={{ fontSize: 8, color: '#FF1888', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.08em' }}>
          MANY
        </span>
      </div>

      {/* ── Zoom hint ────────────────────────────────────────────────────────── */}
      {zoomConfig.zoom === 1 && visitors.length > 0 && <ZoomHint />}
    </div>
  );
}

// ── Zoom hint ─────────────────────────────────────────────────────────────────
function ZoomHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-3 right-3 z-10 pointer-events-none"
        >
          <div style={{
            background: 'rgba(4,0,18,0.75)',
            border: '1px solid rgba(40,20,80,0.4)',
            borderRadius: 20,
            padding: '4px 10px',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{
              fontSize: 9, color: '#4B3F68',
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.04em',
            }}>
              Scroll to zoom · Drag to pan · Double-click to reset
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
