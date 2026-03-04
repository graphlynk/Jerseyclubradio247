import svgPaths from "./svg-6k9qglw4qh";

export default function Group() {
  return (
    <div className="relative" style={{ width: 44, height: 44 }}>
      <svg
        className="absolute block"
        fill="none"
        viewBox="0 0 85.6074 85.6074"
        style={{ width: 44, height: 44, overflow: 'visible' }}
      >
        <g clipPath="url(#clip0_yt62)" id="Group 6">
          <g filter="url(#filter0_ii_yt62)" id="Circle">
            <circle cx="42.8037" cy="42.8037" fill="url(#paint0_linear_yt62)" r="42.8037" />
          </g>
          <path
            clipRule="evenodd"
            d={svgPaths.p158b4f00}
            fill="url(#paint1_linear_yt62)"
            fillRule="evenodd"
            id="Subtract"
          />
        </g>
        <defs>
          <filter
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
            height="99.6074"
            id="filter0_ii_yt62"
            width="85.6074"
            x="0"
            y="-10"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="4" />
            <feGaussianBlur stdDeviation="2.5" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow_yt62" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="-10" />
            <feGaussianBlur stdDeviation="5" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" />
            <feBlend in2="effect1_innerShadow_yt62" mode="normal" result="effect2_innerShadow_yt62" />
          </filter>
          {/* Background: solid dark circle matching TikTok/Instagram tiles */}
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_yt62" x1="42.8037" x2="42.8037" y1="0" y2="85.6074">
            <stop stopColor="#1a1a2e" />
            <stop offset="1" stopColor="#121A21" />
          </linearGradient>
          {/* YouTube play button: red-to-pink gradient */}
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_yt62" x1="42.4846" x2="42.4846" y1="23.5421" y2="62.0654">
            <stop stopColor="#FF0000" stopOpacity="0.85" />
            <stop offset="1" stopColor="#FF7979" />
          </linearGradient>
          <clipPath id="clip0_yt62">
            <rect fill="white" height="85.6074" width="85.6074" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}