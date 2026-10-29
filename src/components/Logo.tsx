/**
 * Logo "Éco-Sport" : ballon de basket stylisé, feuille en premier plan
 * et flèche circulaire de mobilité / recyclage.
 */
export function Logo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Logo Appli Basket Carbone">
      {/* flèche de mobilité */}
      <path
        d="M9.5 21A23 23 0 0 1 34 7.6"
        fill="none"
        stroke="#10a571"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M31.4 3.2 38.6 8.4 31.2 12.6Z" fill="#10a571" />

      {/* ballon */}
      <circle cx="28" cy="34" r="19" fill="#d9672f" />
      <circle cx="28" cy="34" r="19" fill="url(#reflet)" />
      <g fill="none" stroke="#93411f" strokeWidth="2" strokeLinecap="round">
        <path d="M28 15v38" />
        <path d="M9 34h38" />
        <path d="M14.6 20.6c5.4 3.6 8.4 8.4 8.4 13.4s-3 9.8-8.4 13.4" />
        <path d="M41.4 20.6C36 24.2 33 29 33 34s3 9.8 8.4 13.4" />
      </g>

      {/* feuille */}
      <path
        d="M36 60c0-17 9.6-28.4 25-31 0 17.6-9.2 31-25 31Z"
        fill="#1d553b"
        stroke="#fbf8f2"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M39 57.4c4.6-7 9.6-14.2 18.4-24.6" stroke="#acd8bd" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M45.6 48.6l-4.8-1.4M50.6 42.2l-4.6-1.8M49 45.4l4.8-.4" stroke="#acd8bd" strokeWidth="1.4" strokeLinecap="round" />

      <defs>
        <radialGradient id="reflet" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
