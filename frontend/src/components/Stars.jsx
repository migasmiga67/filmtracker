export default function Stars({ value = 0, onChange, size = 28 }) {
  const readOnly = !onChange
  return (
    <div className="stars" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Ocena: ${value} z 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value)
        const star = (
          <svg width={size} height={size} viewBox="0 0 24 24" className={filled ? 'star on' : 'star'}>
            <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z" />
          </svg>
        )
        return readOnly ? (
          <span key={n}>{star}</span>
        ) : (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} z 5`}
            onClick={() => onChange(n === value ? 0 : n)}
          >
            {star}
          </button>
        )
      })}
    </div>
  )
}
