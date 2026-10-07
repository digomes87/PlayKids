const MAX_STARS = 3;

export function Stars({ count }: { readonly count: number }) {
  return (
    <p className="stars" role="img" aria-label={`${count} de ${MAX_STARS} estrelas`}>
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <svg key={index} className={index < count ? 'stars__star stars__star--on' : 'stars__star'} viewBox="0 0 100 100">
          <path d="M50 8l12.6 26.4 28.9 3.9-21.1 20.1 5.2 28.7L50 73.2 24.4 87.1l5.2-28.7L8.5 38.3l28.9-3.9z" />
        </svg>
      ))}
    </p>
  );
}
