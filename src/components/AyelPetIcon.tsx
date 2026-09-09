export default function AyelPetIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        <circle cx="42" cy="19" r="4.5" opacity="0.95" />
        <circle cx="42" cy="19" r="9" opacity="0.55" />
        <circle cx="42" cy="19" r="13.5" opacity="0.3" />
        <line x1="42" y1="2" x2="42" y2="14.5" opacity="0.9" />
        <line x1="42" y1="23.5" x2="42" y2="36" opacity="0.5" />
        <line x1="25.5" y1="19" x2="38" y2="19" opacity="0.9" />
        <line x1="46" y1="19" x2="58" y2="19" opacity="0.55" />
        <line x1="30.6" y1="7.2" x2="39.3" y2="15.4" opacity="0.7" />
        <line x1="44.7" y1="22.6" x2="51.8" y2="30.8" opacity="0.85" />
        <line x1="52" y1="7.5" x2="45.4" y2="14.3" opacity="0.4" />
        <line x1="33.4" y1="23.4" x2="28.6" y2="29" opacity="0.6" />
      </g>
      <path d="M42 19 L58.5 10 A16.5 16.5 0 0 1 58.5 26.5 Z" fill="currentColor" opacity="0.2" />
      <circle cx="42" cy="19" r="2.4" fill="currentColor" />
      <g fill="currentColor">
        <ellipse cx="20" cy="50" rx="2.9" ry="2.2" transform="rotate(-14 20 50)" opacity="0.95" />
        <circle cx="14.6" cy="46" r="1.1" opacity="0.85" />
        <circle cx="20.4" cy="44.6" r="1.5" opacity="0.7" />
        <circle cx="26" cy="46.4" r="1.2" opacity="0.9" />
      </g>
      <line x1="2" y1="58" x2="40" y2="58" stroke="currentColor" strokeWidth="2.4" opacity="0.25" strokeLinecap="round" />
    </svg>
  );
}