import { useMemo, useState } from 'react'

const CHAVE = 'tf-flores'
const QTD = 14

function preferenciaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo !== null) return salvo === '1'
  } catch {
    /* sem armazenamento: segue o padrão */
  }
  // quem pede menos movimento no aparelho começa com as flores desligadas
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// pétalas caindo devagar + botão para ligar/desligar
export default function Petalas() {
  const [ligado, setLigado] = useState(preferenciaInicial)

  const petalas = useMemo(
    () =>
      Array.from({ length: QTD }, (_, k) => {
        const r = (n) => ((k * 9301 + n * 49297) % 233280) / 233280 // pseudoaleatório estável
        return {
          left: `${(r(1) * 100).toFixed(1)}%`,
          '--tam': `${(10 + r(2) * 10).toFixed(0)}px`,
          '--dur': `${(11 + r(3) * 10).toFixed(1)}s`,
          '--atraso': `${(-r(4) * 20).toFixed(1)}s`,
          '--balanco': `${(20 + r(5) * 50).toFixed(0)}px`,
          '--opac': (0.35 + r(6) * 0.4).toFixed(2),
        }
      }),
    []
  )

  function alternar() {
    setLigado((v) => {
      try {
        localStorage.setItem(CHAVE, v ? '0' : '1')
      } catch {
        /* tudo bem não salvar */
      }
      return !v
    })
  }

  return (
    <>
      {ligado && (
        <div className="petalas" aria-hidden="true">
          {petalas.map((estilo, k) => (
            <span key={k} className="petala" style={estilo}>
              <i />
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`btn-flores ${ligado ? '' : 'desligado'}`}
        onClick={alternar}
        aria-pressed={ligado}
        aria-label={ligado ? 'Desligar flores caindo' : 'Ligar flores caindo'}
        title={ligado ? 'Desligar flores' : 'Ligar flores'}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <g fill="currentColor">
            {[0, 72, 144, 216, 288].map((g) => (
              <ellipse key={g} cx="12" cy="6.5" rx="3.1" ry="4.6" transform={`rotate(${g} 12 12)`} opacity=".85" />
            ))}
          </g>
          <circle cx="12" cy="12" r="2" fill="#fff" />
        </svg>
      </button>
    </>
  )
}
