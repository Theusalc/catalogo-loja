import { useEffect, useState } from 'react'

export default function VoltarAoTopo() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > 300)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  // fica sempre na página; aparece e some com uma transição suave
  return (
    <button
      type="button"
      className={`btn-topo ${visivel ? 'visivel' : ''}`}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      tabIndex={visivel ? 0 : -1}
      aria-hidden={!visivel}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M6 14.500l6-6 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.400"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
