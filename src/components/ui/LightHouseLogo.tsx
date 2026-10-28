import React from 'react';

interface LightHouseLogoProps {
  className?: string;
  showText?: boolean;
  subtext?: string;
  size?: number;
}

export const LightHouseLogo: React.FC<LightHouseLogoProps> = ({
  className = '',
  showText = true,
  subtext = 'PROTOTYPE SOFTWARE PIPELINE',
  size = 40,
}) => {
  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`} id="lighthouse-logo-container">
      {/* High-Fidelity SVG Lighthouse Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_8px_rgba(6,182,212,0.15)]"
        id="lighthouse-svg"
      >
        {/* Definition for clipping mask of the lighthouse tower */}
        <defs>
          <clipPath id="lighthouse-body-clip">
            <path d="M42 35 L58 35 L64 85 L36 85 Z" />
          </clipPath>
          <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* 1. LIGHTHOUSE TOWER SHAPE (Clipped for diagonal stripes) */}
        <g clipPath="url(#lighthouse-body-clip)">
          {/* Base white background of the tower */}
          <rect x="30" y="30" width="40" height="60" fill="#f4f4f5" />
          
          {/* Diagonal Blue Stripes */}
          <path d="M30 35 L70 50 L70 60 L30 45 Z" fill="#1e3a8a" />
          <path d="M30 53 L70 68 L70 78 L30 63 Z" fill="#1e3a8a" />
          <path d="M30 71 L70 86 L70 96 L30 81 Z" fill="#1e3a8a" />
        </g>

        {/* 2. LIGHTHOUSE ARCHITECTURAL DETAILS (On top of body) */}
        {/* Tower Outlines */}
        <path d="M42 35 L58 35 L64 85 L36 85 Z" stroke="#1e3a8a" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Small window inside the tower */}
        <rect x="47" y="52" width="6" height="10" rx="3" fill="#1e293b" stroke="#f4f4f5" strokeWidth="1" />

        {/* Balcony / Gallery Platform */}
        <path d="M38 35 L62 35" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 33 L60 33" stroke="#1e3a8a" strokeWidth="2.5" />
        
        {/* Lantern Room (Glass section) */}
        <rect x="45" y="24" width="10" height="9" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
        <line x1="50" y1="24" x2="50" y2="33" stroke="#1e3a8a" strokeWidth="1.5" />

        {/* Gallery Railings */}
        <line x1="41" y1="30" x2="41" y2="33" stroke="#1e3a8a" strokeWidth="1.5" />
        <line x1="59" y1="30" x2="59" y2="33" stroke="#1e3a8a" strokeWidth="1.5" />

        {/* Dome Cap */}
        <path d="M43 24 Q50 14 57 24 Z" fill="#1e3a8a" stroke="#1e3a8a" strokeWidth="1" strokeLinejoin="round" />
        
        {/* Spire tip */}
        <line x1="50" y1="14" x2="50" y2="10" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />

        {/* 3. DYNAMIC WAVES (Sweeping under and to the right) */}
        {/* Back Wave */}
        <path
          d="M10 82 Q30 72 55 80 T95 76 T120 80"
          fill="none"
          stroke="url(#wave-grad-1)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Front Wave */}
        <path
          d="M5 88 Q28 78 52 86 T90 82 T115 86"
          fill="none"
          stroke="url(#wave-grad-2)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Text Branding */}
      {showText && (
        <div className="flex flex-col justify-center leading-none" id="logo-text-block">
          <div className="flex items-baseline gap-1" id="logo-main-title">
            <span className="font-display font-extrabold text-xl tracking-wide text-white uppercase">
              Lighthouse
            </span>
            <span className="text-red-500 font-bold text-2xl font-sans" style={{ lineHeight: 1 }}>
              橋
            </span>
          </div>
          <span className="text-[8px] font-mono tracking-[0.25em] text-sleek-muted uppercase mt-0.5 whitespace-nowrap">
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
};
