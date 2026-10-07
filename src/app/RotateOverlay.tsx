/** Visível só em retrato (ver global.css): o jogo é pensado para paisagem. */
export function RotateOverlay() {
  return (
    <div className="rotate-overlay" role="alert">
      <svg className="rotate-overlay__icon" viewBox="0 0 120 120" aria-hidden="true">
        <rect x="38" y="14" width="44" height="72" rx="8" />
        <path d="M22 96a44 44 0 0 0 76 6" />
        <path d="M100 88l-1 16-15-6" />
      </svg>
      <p>Gire o tablet para jogar!</p>
    </div>
  );
}
