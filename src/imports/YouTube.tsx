import svgPaths from "./svg-4pk2tphhjo";

// ── Shared edge-highlight layer (same card geometry as Instagram) ──────────────
function Highlights() {
  return (
    <div className="absolute h-[980px] left-[56px] top-[33px] w-[986.93px]" data-name="Highlights">
      <div className="absolute inset-[-0.51%_-0.11%_-0.51%_-0.51%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 993 990">
          <g id="yt_Highlights">
            <g filter="url(#yt_hf0)"><path d={svgPaths.p2502f440} fill="white" /></g>
            <g filter="url(#yt_hf1)"><path d={svgPaths.pe1fb300}  fill="white" /></g>
            <g filter="url(#yt_hf2)"><path d={svgPaths.p3251e900} fill="white" /></g>
            <g filter="url(#yt_hf3)"><path d={svgPaths.p1a8d9200} fill="url(#yt_hp0)" /></g>
            <g filter="url(#yt_hf4)"><path d={svgPaths.pdc6b3f1}  fill="url(#yt_hp1)" /></g>
            <g filter="url(#yt_hf5)"><path d={svgPaths.p33aa7080} fill="url(#yt_hp2)" /></g>
          </g>
          <defs>
            <filter id="yt_hf0" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="85"      width="97"      x="0"      y="905">
              <feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" /><feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <filter id="yt_hf1" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="64.5"   width="53.6552" x="930.5" y="34.5">
              <feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" /><feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <filter id="yt_hf2" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="39.3483" width="44.7089" x="905.86" y="934.07">
              <feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" /><feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <filter id="yt_hf3" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="50"     width="903"     x="37"     y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" /><feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <filter id="yt_hf4" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="860"    width="50"      x="943"    y="68">
              <feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" /><feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            <filter id="yt_hf5" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="42.8389" width="162.5"  x="775"    y="29.6611">
              <feFlood floodOpacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" /><feGaussianBlur result="effect1_foregroundBlur" stdDeviation="2.5" />
            </filter>
            {/* Top-edge highlight (fades in from left, full across, fades out right) */}
            <linearGradient id="yt_hp0" gradientUnits="userSpaceOnUse" x1="914" x2="63.999" y1="5" y2="5">
              <stop stopColor="white" stopOpacity="0" />
              <stop offset="0.130208" stopColor="white" />
              <stop offset="0.864583" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            {/* Right-edge highlight (vertical) */}
            <linearGradient id="yt_hp1" gradientUnits="userSpaceOnUse" x1="988" x2="988" y1="903.011" y2="93.9397">
              <stop stopColor="white" stopOpacity="0.45" />
              <stop offset="0.130208" stopColor="white" stopOpacity="0.55" />
              <stop offset="0.864583" stopColor="white" stopOpacity="0.55" />
              <stop offset="1" stopColor="white" stopOpacity="0.45" />
            </linearGradient>
            {/* Top-right corner accent */}
            <linearGradient id="yt_hp2" gradientUnits="userSpaceOnUse" x1="933" x2="780" y1="67" y2="35">
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ── Dark card + YouTube play-button icon ──────────────────────────────────────
// Card occupies (72,59)→(1152,1139) inside the 1822×1968 viewBox.
// Card centre: x=612, y=599.
// Play-button rect: 480×336, centred → x1=372, y1=431, x2=852, y2=767, rx=80
// Play triangle (CCW for evenodd hole): tip=(712,599), left-top=(520,483), left-bottom=(520,715)
function Frame() {
  return (
    <div className="absolute left-0 size-[1080px] top-0">
      <div className="absolute inset-[-5.46%_-62.04%_-76.76%_-6.67%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1822 1968">
          <g filter="url(#yt_card_f)" id="yt_Frame">
            {/* #161616 rounded card — identical to Instagram */}
            <rect fill="#161616" height="1080" rx="200" width="1080" x="72" y="59" />
            {/* YouTube play-button icon — white gradient, evenodd cutout triangle */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 452 431 L 772 431 Q 852 431 852 511 L 852 687 Q 852 767 772 767 L 452 767 Q 372 767 372 687 L 372 511 Q 372 431 452 431 Z M 712 599 L 520 715 L 520 483 Z"
              fill="url(#yt_icon_p)"
            />
          </g>
          <defs>
            {/* 5-pass drop shadow — identical to Instagram card shadow */}
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"
              height="1968" id="yt_card_f" width="1822" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset /><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="e1" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dx="25" dy="35" /><feGaussianBlur stdDeviation="47" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
              <feBlend in2="e1" mode="normal" result="e2" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dx="99" dy="139" /><feGaussianBlur stdDeviation="85.5" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.09 0" />
              <feBlend in2="e2" mode="normal" result="e3" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dx="224" dy="313" /><feGaussianBlur stdDeviation="115.5" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
              <feBlend in2="e3" mode="normal" result="e4" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dx="397" dy="556" /><feGaussianBlur stdDeviation="136.5" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.01 0" />
              <feBlend in2="e4" mode="normal" result="e5" />
              <feBlend in="SourceGraphic" in2="e5" mode="normal" result="shape" />
            </filter>
            {/* Icon gradient: white → white 55% (same pattern as Instagram) */}
            <linearGradient id="yt_icon_p" gradientUnits="userSpaceOnUse"
              x1="612" x2="612" y1="431" y2="767">
              <stop stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0.55" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export default function YouTube() {
  return (
    <div className="relative size-full" data-name="YouTube">
      <Frame />
      <Highlights />
    </div>
  );
}
