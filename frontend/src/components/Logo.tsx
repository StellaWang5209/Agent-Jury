/**
 * Agent Jury 品牌徽标
 * 金色渐变圆角徽章 · 盾牌（安全承诺）+ 天平（陪审裁决）+ 顶部 AI 节点
 */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Agent Jury Logo"
    >
      <defs>
        <linearGradient
          id="aj-gold"
          x1="8"
          y1="6"
          x2="56"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F8E9B5" />
          <stop offset="0.45" stopColor="#E3C05F" />
          <stop offset="1" stopColor="#A8862A" />
        </linearGradient>
        <radialGradient id="aj-inner" cx="0.5" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#2A2410" />
          <stop offset="1" stopColor="#0B0B13" />
        </radialGradient>
      </defs>

      {/* 徽章底座 */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill="url(#aj-inner)"
        stroke="url(#aj-gold)"
        strokeWidth="2"
      />

      {/* 盾牌 */}
      <path
        d="M32 9 L50 16 V30 C50 42.5 42.5 50.5 32 55 C21.5 50.5 14 42.5 14 30 V16 Z"
        fill="rgba(212,175,55,0.10)"
        stroke="url(#aj-gold)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* 天平横梁 */}
      <line
        x1="19"
        y1="25"
        x2="45"
        y2="25"
        stroke="url(#aj-gold)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* 横梁两端吊点 */}
      <circle cx="19" cy="25" r="1.8" fill="#F8E9B5" />
      <circle cx="45" cy="25" r="1.8" fill="#F8E9B5" />

      {/* 中柱 + 顶部 AI 节点 */}
      <line
        x1="32"
        y1="20"
        x2="32"
        y2="44"
        stroke="url(#aj-gold)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="19" r="2.8" fill="#F8E9B5" />
      <circle cx="32" cy="19" r="1.2" fill="#A8862A" />

      {/* 左盘吊绳 + 秤盘 */}
      <line x1="19" y1="25" x2="15" y2="33" stroke="url(#aj-gold)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="19" y1="25" x2="25" y2="33" stroke="url(#aj-gold)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M15 33 A5 3.2 0 0 0 25 33 Z"
        fill="rgba(212,175,55,0.4)"
        stroke="url(#aj-gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* 右盘吊绳 + 秤盘 */}
      <line x1="45" y1="25" x2="39" y2="33" stroke="url(#aj-gold)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="45" y1="25" x2="49" y2="33" stroke="url(#aj-gold)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M39 33 A5 3.2 0 0 0 49 33 Z"
        fill="rgba(212,175,55,0.4)"
        stroke="url(#aj-gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* 底座 */}
      <line x1="27" y1="44" x2="37" y2="44" stroke="url(#aj-gold)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="24" y1="47.5" x2="40" y2="47.5" stroke="url(#aj-gold)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
