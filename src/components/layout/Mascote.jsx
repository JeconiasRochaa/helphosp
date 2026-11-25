/** Mascote do menu: técnico de TI simpático (headset, boné azul, crachá). Decorativo — não captura cliques. */
export default function Mascote({ size = 46 }) {
  return (
    <svg className="sb-mascote" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {/* corpo / uniforme */}
      <path d="M6 48c0-9.5 7.5-15 18-15s18 5.500 18 15z" fill="#2f6fed" />
      <path d="M17 34.500 24 42l7-7.500c-2-1-4.300-1.500-7-1.500s-5 .5-7 1.500z" fill="#e8f0ff" />
      <path d="M24 42 21 38.500h6z" fill="#1d4ed8" />
      {/* crachá */}
      <rect x="31" y="38" width="8" height="6" rx="1.400" fill="#fff" />
      <rect x="32.300" y="39.300" width="2.600" height="2.600" rx="1.300" fill="#4d8dff" />
      <rect x="35.500" y="39.600" width="2.200" height=".9" rx=".45" fill="#94a3b8" />
      <rect x="35.500" y="41.400" width="2.200" height=".9" rx=".45" fill="#94a3b8" />
      {/* pescoço e cabeça */}
      <rect x="21" y="29" width="6" height="6" rx="2" fill="#e9b88f" />
      <circle cx="24" cy="21" r="10" fill="#f6cfa9" />
      {/* boné */}
      <path d="M13.500 18.500C13.800 11.500 18.200 8 24 8s10.200 3.500 10.500 10.500z" fill="#1d4ed8" />
      <rect x="12" y="17.500" width="24" height="2.600" rx="1.300" fill="#1e40af" />
      <circle cx="24" cy="13" r="1.800" fill="#93c5fd" />
      {/* headset */}
      <rect x="10.800" y="20" width="3.400" height="7" rx="1.700" fill="#93c5fd" />
      <rect x="33.800" y="20" width="3.400" height="7" rx="1.700" fill="#93c5fd" />
      <path d="M35.500 26.500c0 4-3 5.500-7.500 5" fill="none" stroke="#93c5fd" strokeWidth="1.400" strokeLinecap="round" />
      <circle cx="27.800" cy="31.600" r="1.500" fill="#60a5fa" />
      {/* rosto */}
      <circle cx="20.200" cy="22.500" r="1.400" fill="#1e293b" />
      <circle cx="27.800" cy="22.500" r="1.400" fill="#1e293b" />
      <circle cx="19.700" cy="22" r=".45" fill="#fff" /><circle cx="27.300" cy="22" r=".45" fill="#fff" />
      <path d="M20.500 26c1 1.600 5.500 1.600 7 0" fill="none" stroke="#9a4a2a" strokeWidth="1.200" strokeLinecap="round" />
      <circle cx="17.500" cy="25.500" r="1.600" fill="#f4a58a" opacity=".5" /><circle cx="30.500" cy="25.500" r="1.600" fill="#f4a58a" opacity=".5" />
    </svg>
  );
}
