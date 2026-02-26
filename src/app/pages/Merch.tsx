import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Flame, Clock, ExternalLink, CreditCard,
  Sparkles, ChevronRight, ArrowUpRight, Tag,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useBPMPulse } from '../hooks/useBPMPulse';

// ─── Actual product images from Creator Spring ────────────────────
import imgIndustrialHoodie from '../../assets/3b28a70b73e6cfa88d35080f20eec3643a67e593.png';
import imgIndustrialTee from '../../assets/ac831d7cc86290d293cd044d7057f9e579a230b2.png';
import imgIndustrialMug from '../../assets/39d76e26f03123d839fd9d69460bdf495a8ed791.png';
import imgIndustrialLongSleeve from '../../assets/d178debbb18f8c5c18c1f5a07accd42507235e6c.png';
import imgCoreHoodie from '../../assets/a0723a74fccaec51c528e8de1f342adf43510ce8.png';
import imgCoreHeavyTee from '../../assets/9bcff617a83e9eee47e2a99c963a04b301b59602.png';
import imgCoreCrewneck from '../../assets/6e7fc25e4af20175b8a7ce484c467ea28e08461a.png';
import imgCoreCrewTee from '../../assets/a7addac8ece682953f7a77a390a6e36a41da3f59.png';
import imgCoreCropTee from '../../assets/26540902785a9fc7a0c83d08c5b1a0ef6832fdb3.png';
import imgStreetHoodie from '../../assets/f0fcab775344a238aa4305d503f78c2a131f54f9.png';
import imgCoreMug from '../../assets/af320ab21ab82a206745e18e45393b2a6615227f.png';
import imgCoreLongSleeve from '../../assets/a4485c9b5ad1455e27c265c337d7bf38128902ec.png';
import imgStreetTee from '../../assets/83e1621a2193701bd356b7e2ac630687ab76a30a.png';
import imgStreetMug from '../../assets/7e2c294e122c805dd0314a08b2c274f546fe4828.png';
import imgStreetTote from '../../assets/defb051e59f94d0335136ab6744d6332f1d433b4.png';

const STORE_URL = 'https://jerseyclubradio.creator-spring.com';

// ─── Types ────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  subtitle: string;
  collection: 'The Industrial Drop' | 'The Core Series' | 'Official Streetwear';
  category: 'Apparel' | 'Accessories' | 'Home';
  price: number;
  compareAt: number;
  image: string;
  badge?: string;
  soldOut?: boolean;
}

// ─── Product Data (exact items from store) ────────────────────────
const PRODUCTS: Product[] = [
  // THE INDUSTRIAL DROP
  {
    id: 'ind-hoodie',
    name: 'CLASSIC PULLOVER HOODIE',
    subtitle: 'The Industrial Drop',
    collection: 'The Industrial Drop',
    category: 'Apparel',
    price: 44.95,
    compareAt: 64.99,
    image: imgIndustrialHoodie,
    badge: 'BEST SELLER',
  },
  {
    id: 'ind-tee',
    name: 'CLASSIC CREW NECK T-SHIRT',
    subtitle: 'The Industrial Drop',
    collection: 'The Industrial Drop',
    category: 'Apparel',
    price: 29.95,
    compareAt: 39.99,
    image: imgIndustrialTee,
  },
  {
    id: 'ind-mug',
    name: 'CERAMIC MUG',
    subtitle: 'The Industrial Drop',
    collection: 'The Industrial Drop',
    category: 'Home',
    price: 15.99,
    compareAt: 22.99,
    image: imgIndustrialMug,
  },
  {
    id: 'ind-ls',
    name: 'CLASSIC LONG SLEEVE TEE',
    subtitle: 'The Industrial Drop',
    collection: 'The Industrial Drop',
    category: 'Apparel',
    price: 35.95,
    compareAt: 49.99,
    image: imgIndustrialLongSleeve,
  },

  // THE CORE SERIES
  {
    id: 'core-hoodie',
    name: 'CLASSIC PULLOVER HOODIE',
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Apparel',
    price: 44.95,
    compareAt: 64.99,
    image: imgCoreHoodie,
    badge: 'FAN FAVORITE',
  },
  {
    id: 'core-heavy',
    name: 'HEAVY TEE',
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Apparel',
    price: 44.95,
    compareAt: 59.99,
    image: imgCoreHeavyTee,
    badge: 'PREMIUM',
  },
  {
    id: 'core-crew-sw',
    name: 'CLASSIC CREWNECK SWEATSHIRT',
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Apparel',
    price: 34.95,
    compareAt: 49.99,
    image: imgCoreCrewneck,
  },
  {
    id: 'core-tee',
    name: 'CLASSIC CREW NECK T-SHIRT',
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Apparel',
    price: 22.95,
    compareAt: 34.99,
    image: imgCoreCrewTee,
  },
  {
    id: 'core-crop',
    name: "WOMEN'S RELAXED CROP TEE",
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Apparel',
    price: 29.95,
    compareAt: 39.99,
    image: imgCoreCropTee,
    badge: 'NEW',
  },
  {
    id: 'core-mug',
    name: 'CERAMIC MUG',
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Home',
    price: 15.99,
    compareAt: 22.99,
    image: imgCoreMug,
  },
  {
    id: 'core-ls',
    name: 'CLASSIC LONG SLEEVE TEE',
    subtitle: 'The Core Series',
    collection: 'The Core Series',
    category: 'Apparel',
    price: 32.95,
    compareAt: 44.99,
    image: imgCoreLongSleeve,
  },

  // OFFICIAL STREETWEAR
  {
    id: 'street-hoodie',
    name: 'CLASSIC PULLOVER HOODIE',
    subtitle: 'Official Streetwear',
    collection: 'Official Streetwear',
    category: 'Apparel',
    price: 49.95,
    compareAt: 69.99,
    image: imgStreetHoodie,
    badge: 'LIMITED DROP',
  },
  {
    id: 'street-tee',
    name: 'CLASSIC CREW NECK T-SHIRT',
    subtitle: 'Official Streetwear',
    collection: 'Official Streetwear',
    category: 'Apparel',
    price: 34.95,
    compareAt: 44.99,
    image: imgStreetTee,
  },
  {
    id: 'street-mug',
    name: 'CERAMIC MUG',
    subtitle: 'Official Streetwear',
    collection: 'Official Streetwear',
    category: 'Home',
    price: 15.99,
    compareAt: 22.99,
    image: imgStreetMug,
  },
  {
    id: 'street-tote',
    name: 'TOTE BAG',
    subtitle: 'Official Streetwear',
    collection: 'Official Streetwear',
    category: 'Accessories',
    price: 29.95,
    compareAt: 39.99,
    image: imgStreetTote,
  },
];

type FilterCategory = 'All' | 'Apparel' | 'Accessories' | 'Home';
const FILTERS: FilterCategory[] = ['All', 'Apparel', 'Accessories', 'Home'];

// ─── Helpers ──────────────────────────────────────────────────────
function pctOff(compare: number, price: number) {
  return Math.round(((compare - price) / compare) * 100);
}

function useCountdown() {
  const getMs = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(23, 59, 59, 999);
    return midnight.getTime() - now.getTime();
  };
  const [ms, setMs] = useState(getMs());
  useEffect(() => {
    const t = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { h, m, s };
}

const COLLECTION_ACCENT: Record<string, string> = {
  'The Industrial Drop': '#E8540C',
  'The Core Series': '#9D00FF',
  'Official Streetwear': '#E8540C',
};

// ═══════════════════════════════════════════════════════════════════
export function Merch() {
  const [filter, setFilter] = useState<FilterCategory>('All');
  const [hovered, setHovered] = useState<string | null>(null);
  const { isPlaying } = usePlayer();
  const { pulse } = useBPMPulse(isPlaying);
  const { h, m, s } = useCountdown();

  const filtered = filter === 'All'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === filter);

  const maxSave = Math.max(...PRODUCTS.map(p => pctOff(p.compareAt, p.price)));

  return (
    <div className="min-h-[calc(100vh-96px)]" style={{ background: '#06000F' }}>

      {/* ── SALE TICKER ──────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#09001400' }}
      >
        <div className="relative flex items-center justify-center gap-4 py-2.5 px-4">
          <Flame className="w-3.5 h-3.5 text-[#E8540C] animate-pulse" />
          <span
            className="text-[11px] tracking-[0.25em] font-semibold"
            style={{ fontFamily: 'Archivo, Inter, sans-serif', color: '#999' }}
          >
            FLASH SALE — UP TO {maxSave}% OFF
          </span>
          <span
            className="font-mono text-[11px] tabular-nums px-2.5 py-0.5 rounded-md"
            style={{ background: 'rgba(232,84,12,0.1)', color: '#E8540C', border: '1px solid rgba(232,84,12,0.2)' }}
          >
            {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
          </span>
          <Flame className="w-3.5 h-3.5 text-[#E8540C] animate-pulse" />

          {/* Compact social icons — pinned right */}
          <div className="absolute right-3 hidden md:flex items-center gap-1.5">
            {/* Thin divider */}
            <span className="w-px h-4 mr-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@Jerseyclubradio"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(255,51,51,0.12)', border: '1px solid rgba(255,51,51,0.25)', boxShadow: '0 0 6px rgba(255,51,51,0.2)' }}
              title="YouTube"
            >
              <svg viewBox="0 0 24 24" fill="#FF3333" className="w-3 h-3">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@jerseyclubradio"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(0,242,234,0.08)', border: '1px solid rgba(0,242,234,0.22)', boxShadow: '0 0 6px rgba(0,242,234,0.18)' }}
              title="TikTok"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" style={{ overflow: 'visible' }}>
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#FF0050" transform="translate(0.6,0.6)" opacity="0.8" />
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="#00F2EA" transform="translate(-0.6,-0.6)" opacity="0.8" />
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" fill="white" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/jerseyclubradio/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(225,48,108,0.10)', border: '1px solid rgba(225,48,108,0.25)', boxShadow: '0 0 6px rgba(225,48,108,0.2)' }}
              title="Instagram"
            >
              <svg viewBox="0 0 24 24" fill="#E1306C" className="w-3 h-3">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 md:mb-16"
        >
          <p
            className="text-[11px] tracking-[0.3em] mb-3"
            style={{ fontFamily: 'Archivo, Inter, sans-serif', color: '#E8540C' }}
          >
            JERSEY CLUB RADIO
          </p>
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] mb-5"
            style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
          >
            THE FOUNDATION
            <br />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>COLLECTION</span>
          </h1>
          <p className="text-[#666] text-sm md:text-base max-w-lg leading-relaxed">
            Three collections. Fifteen pieces. Premium streetwear built for
            the culture — every purchase keeps the radio live 24/7.
          </p>

          {/* BNPL strip */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <div className="flex items-center gap-2 text-[11px] text-[#777]">
              <CreditCard className="w-3.5 h-3.5 text-[#555]" />
              <span>Pay in 4 with</span>
            </div>
            {['Afterpay', 'Klarna', 'Affirm'].map(p => (
              <span
                key={p}
                className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background:
                    p === 'Afterpay' ? '#B2FCE4' : p === 'Klarna' ? '#FFB3C7' : '#0FA0EA',
                  color:
                    p === 'Afterpay' ? '#000' : p === 'Klarna' ? '#0A0A0A' : '#fff',
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── FILTER BAR ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1 mb-10 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {FILTERS.map(f => {
            const active = filter === f;
            const count = f === 'All'
              ? PRODUCTS.length
              : PRODUCTS.filter(p => p.category === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="relative px-4 py-3 text-xs tracking-wider transition-colors"
                style={{
                  fontFamily: 'Archivo, Inter, sans-serif',
                  color: active ? '#fff' : '#555',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {f.toUpperCase()}
                <span className="ml-1.5 text-[10px]" style={{ color: active ? '#E8540C' : '#444' }}>
                  {count}
                </span>
                {active && (
                  <motion.div
                    layoutId="filter-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: '#E8540C' }}
                  />
                )}
              </button>
            );
          })}
        </motion.div>

        {/* ── PRODUCT GRID ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => {
              const off = pctOff(item.compareAt, item.price);
              const accent = COLLECTION_ACCENT[item.collection] || '#E8540C';
              const isHovered = hovered === item.id;

              // ── SOLD OUT / DROP SOON ───────────────────────────
              if (item.soldOut) {
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.03 }}
                    layout
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Placeholder image area */}
                    <div
                      className="aspect-square flex flex-col items-center justify-center gap-3"
                      style={{ background: 'rgba(255,255,255,0.015)' }}
                    >
                      <Clock className="w-8 h-8 text-[#333]" />
                      <span
                        className="text-[11px] tracking-[0.2em] font-semibold text-[#444]"
                        style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
                      >
                        DROP SOON
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] tracking-wider text-[#444] mb-1"
                        style={{ fontFamily: 'Archivo, Inter, sans-serif' }}>
                        {item.subtitle.toUpperCase()}
                      </p>
                      <p className="text-white/30 font-bold text-sm" style={{ fontFamily: 'Archivo, Inter, sans-serif' }}>
                        {item.name}
                      </p>
                      <p className="text-[#333] text-xs mt-2">${item.price.toFixed(2)}</p>
                    </div>
                  </motion.div>
                );
              }

              // ── ACTIVE PRODUCT CARD ────────────────────────────
              return (
                <motion.a
                  key={item.id}
                  href={STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.03 }}
                  layout
                  className="group block rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: isHovered
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(255,255,255,0.02)',
                    border: isHovered
                      ? '1px solid rgba(255,255,255,0.10)'
                      : '1px solid rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: isHovered
                      ? '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* ── Image ──────────────────────────────────── */}
                  <div className="relative aspect-square overflow-hidden" style={{ background: '#0a0a0a' }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Subtle top gradient for badges */}
                    <div
                      className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)' }}
                    />

                    {/* Badge */}
                    {item.badge && (
                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[9px] tracking-wider font-bold"
                        style={{
                          fontFamily: 'Archivo, Inter, sans-serif',
                          background: 'rgba(0,0,0,0.6)',
                          backdropFilter: 'blur(10px)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Save badge */}
                    <span
                      className="absolute top-3 right-3 px-2 py-1 rounded-md text-[9px] tracking-wider font-bold"
                      style={{
                        fontFamily: 'Archivo, Inter, sans-serif',
                        background: accent,
                        color: '#fff',
                      }}
                    >
                      −{off}%
                    </span>

                    {/* Quick Add overlay */}
                    <div
                      className="absolute inset-0 flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}
                    >
                      <div
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] tracking-wider font-bold text-white transition-transform duration-300 group-hover:translate-y-0 translate-y-4"
                        style={{
                          fontFamily: 'Archivo, Inter, sans-serif',
                          background: accent,
                          boxShadow: `0 8px 32px ${accent}50`,
                        }}
                      >
                        QUICK ADD
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* ── Info ────────────────────────────────────── */}
                  <div className="p-4">
                    <p
                      className="text-[10px] tracking-[0.2em] mb-1.5"
                      style={{
                        fontFamily: 'Archivo, Inter, sans-serif',
                        color: accent,
                      }}
                    >
                      {item.subtitle.toUpperCase()}
                    </p>

                    <p
                      className="text-white font-bold text-[13px] mb-3 leading-tight"
                      style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
                    >
                      {item.name}
                    </p>

                    {/* Price row */}
                    <div className="flex items-baseline gap-2.5 mb-2">
                      <span
                        className="text-lg font-black text-white"
                        style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
                      >
                        ${item.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#555] line-through">
                        ${item.compareAt.toFixed(2)}
                      </span>
                    </div>

                    {/* BNPL micro */}
                    <p className="text-[10px] text-[#555]">
                      or{' '}
                      <span className="text-[#888] font-semibold">
                        ${(item.price / 4).toFixed(2)}/mo
                      </span>{' '}
                      · Afterpay / Klarna / Affirm
                    </p>
                  </div>
                </motion.a>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── BOTTOM CTA ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 rounded-2xl p-8 md:p-12 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Tag className="w-5 h-5 mx-auto mb-4 text-[#E8540C]" />
          <h2
            className="text-2xl md:text-4xl font-black text-white mb-3"
            style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
          >
            PRICES GO BACK UP
            <br />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>AT MIDNIGHT.</span>
          </h2>
          <p className="text-[#555] text-sm max-w-md mx-auto mb-8">
            Every item is marked down. Once the timer hits zero, full prices return.
            Split any purchase into 4 interest-free payments.
          </p>

          {/* BNPL badges */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { name: 'Afterpay', bg: '#B2FCE4', color: '#000' },
              { name: 'Klarna', bg: '#FFB3C7', color: '#0A0A0A' },
              { name: 'Affirm', bg: '#0FA0EA', color: '#fff' },
            ].map(p => (
              <div
                key={p.name}
                className="px-4 py-2 rounded-lg text-[11px] font-bold"
                style={{ background: p.bg, color: p.color, fontFamily: 'Archivo, Inter, sans-serif' }}
              >
                {p.name}
              </div>
            ))}
          </div>

          <a
            href={STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full font-bold text-white text-[13px] tracking-wider transition-all duration-300 hover:scale-105"
            style={{
              fontFamily: 'Archivo, Inter, sans-serif',
              background: '#E8540C',
              boxShadow: '0 8px 32px rgba(232,84,12,0.3)',
            }}
          >
            SHOP FULL COLLECTION
            <ExternalLink className="w-4 h-4" />
          </a>

          <p className="text-[#333] text-[10px] mt-5 tracking-wider">
            POWERED BY CREATOR SPRING · SECURE CHECKOUT · WORLDWIDE SHIPPING
          </p>
        </motion.div>

        {/* ── STATS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mt-12 mb-4">
          {[
            { val: '2,400+', label: 'ITEMS SOLD' },
            { val: '4.8/5', label: 'AVG RATING' },
            { val: '30+', label: 'COUNTRIES' },
          ].map(s => (
            <div
              key={s.label}
              className="text-center py-6 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <p
                className="text-white font-black text-xl md:text-2xl mb-1"
                style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
              >
                {s.val}
              </p>
              <p
                className="text-[10px] tracking-[0.2em] text-[#555]"
                style={{ fontFamily: 'Archivo, Inter, sans-serif' }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}