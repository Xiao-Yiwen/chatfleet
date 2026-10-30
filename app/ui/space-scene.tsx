"use client";
import { SECTORS } from "../../lib/game";
export default function SpaceScene({ sector, moving, shield, scanned = false }: { sector: number; moving: boolean; shield: number; scanned?: boolean }) {
  const s = SECTORS[Math.min(sector, 2)];
  return <svg className={`space-scene ${moving ? "moving" : ""}`} viewBox="0 0 1000 470" role="img" aria-label={`Your starship approaches ${s.name}`}>
    <defs>
      <radialGradient id="nebula"><stop stopColor={s.color} stopOpacity=".13"/><stop offset="1" stopColor={s.color} stopOpacity="0"/></radialGradient>
      <radialGradient id="planet" cx="30%" cy="23%" r="80%"><stop stopColor={s.color}/><stop offset=".4" stopColor={s.color}/><stop offset=".75" stopColor="#344b4b"/><stop offset="1" stopColor="#101f27"/></radialGradient>
      <linearGradient id="body" x2=".6" y2="1"><stop stopColor="#f2f7e9"/><stop offset=".5" stopColor="#b8c9c4"/><stop offset="1" stopColor="#607a7b"/></linearGradient>
      <linearGradient id="flame"><stop stopColor="#ceff9c" stopOpacity="0"/><stop offset=".7" stopColor="#a5f28b" stopOpacity=".7"/><stop offset="1" stopColor="#eeffdf"/></linearGradient>
      <linearGradient id="glass"><stop stopColor="#a5efe8"/><stop offset="1" stopColor="#256b74"/></linearGradient>
      <clipPath id="planetClip"><circle cx="728" cy="226" r="104"/></clipPath>
      <filter id="glow"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <ellipse cx="686" cy="245" rx="370" ry="240" fill="url(#nebula)"/>
    {Array.from({ length: 83 }, (_, i) => <circle key={i} cx={(i * 173 + 41) % 1000} cy={(i * 89 + 17) % 470} r={i % 9 === 0 ? 1.6 : .8} fill="#c4d2db" opacity={.12 + (i % 5) * .1}/>)}
    <g fill="none" stroke="#c5d9bd" strokeOpacity=".1"><ellipse cx="728" cy="226" rx="160" ry="159"/><ellipse cx="728" cy="226" rx="230" ry="205" strokeDasharray="3 9"/><path d="M0 367 Q450 50 1000 320"/><path d="M0 407 Q430 77 1000 345" strokeDasharray="3 8"/></g>
    <circle cx="728" cy="226" r="113" fill="none" stroke={s.color} strokeOpacity=".12" strokeWidth="10" filter="url(#glow)"/>
    <circle cx="728" cy="226" r="104" fill="url(#planet)"/>
    <g clipPath="url(#planetClip)" fill="#244c40" opacity=".27"><path d="m638 134 30 18 11 31 39-9 14 19-19 31-28 4-3 26-30-3-19-33-21 8-9-35z"/><path d="m734 155 39-9 41 22 4 27-21 23-23-11-10-21-22-4z"/><path d="m715 261 38-21 38 14 2 31-35 40-22-18z"/></g>
    <g fill="none" stroke="#d9eed4" strokeOpacity=".2"><ellipse cx="728" cy="226" rx="104" ry="35" transform="rotate(-28 728 226)"/><ellipse cx="728" cy="226" rx="104" ry="75" transform="rotate(-28 728 226)"/><ellipse cx="728" cy="226" rx="44" ry="104" transform="rotate(-28 728 226)"/></g>
    <path d="M564 313 Q724 175 891 134" fill="none" stroke={s.color} strokeOpacity=".35"/>
    <circle cx="640" cy="258" r="4" fill="#d9f5aa"/><circle cx="640" cy="258" r="11" fill="none" stroke="#d9f5aa" opacity=".5" className="beacon"/>
    <path d="m636 258-38 35h-68" stroke="#b9d89a" strokeOpacity=".5" fill="none"/>
    <text x="457" y="289" fill="#a6ba9d" fontSize="10" fontFamily="monospace" letterSpacing="1">DISTRESS SIGNAL</text>
    <text x="457" y="305" fill="#d9efcd" fontSize="12" fontFamily="monospace">{scanned ? "3 LIFE SIGNS CONFIRMED" : "SCAN TO LOCATE SURVIVORS"}</text>
    <g className="ship-float">
      {shield > 0 && <ellipse cx="340" cy="245" rx="147" ry="92" transform="rotate(-13 340 245)" fill="#b9ffae" fillOpacity=".015" stroke="#b9ffae" strokeOpacity={shield / 600} strokeDasharray="6 9"/>}
      <g transform="translate(327 229) rotate(-13)">
        <path className="exhaust" d="M-88-8 -230 3 -88 17Z" fill="url(#flame)"/>
        <path d="m-66-19-23-35 47 8L0-19z" fill="#50686b" stroke="#8a9c98"/>
        <path d="m-60 20-19 51 49-18L6 24z" fill="#536d70" stroke="#a4b4aa"/>
        <path d="m-79-17 105-12 72 30-71 28-106-13Z" fill="url(#body)" stroke="#ccd8cb"/>
        <path d="m-53-18 21-29 43 7 44 28-45 5z" fill="#d0dbd1"/>
        <path d="m-53 18 21 29 43-7 44-28-45-5z" fill="#879f9a"/>
        <path d="m-10-11 28-5 31 16-32 7-29-5z" fill="url(#glass)" stroke="#a7d4ca"/>
        <path d="M-79-14h14v27h-14z" fill="#3d525b"/><path d="M-82-9h6v17h-6z" fill="#d8ffb9"/>
        <path d="M51-8 81 0 51 8" fill="#c7d7c8"/>
        <path d="M-40 8h28M-41-6h14M-39 26l16-5" stroke="#5b7874" strokeWidth="2"/>
        <path d="M-57-28h22v4h-22" fill="#d9ff9b"/>
        <circle cx="-48" cy="-2" r="3" fill="#c1ff9d"/>
      </g>
    </g>
    <g stroke="#7b9295" strokeWidth="1" opacity=".4"><path d="M26 38V23h15M974 38V23h-15M26 428v15h15M974 428v15h-15"/></g>
    <text x="43" y="428" fontFamily="monospace" fontSize="10" fill="#7a8d94" letterSpacing="1">CF–01 / THE WAYFARER</text>
    <text x="957" y="428" textAnchor="end" fontFamily="monospace" fontSize="10" fill="#7a8d94" letterSpacing="1">{s.code} · SECTOR {Math.min(sector + 1, 3)} OF 3</text>
  </svg>;
}
