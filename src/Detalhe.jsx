import { useEffect, useRef, useState } from 'react'

const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Detalhe({ produto, whatsapp, onFechar }) {
  const fotos = produto.fotos?.length
    ? produto.fotos
    : produto.foto_url
      ? [produto.foto_url]
      : []
  const [i, setI] = useState(0)
  const toqueX = useRef(null)

  const passo = (d) => setI((a) => (a + d + fotos.length) % fotos.length)

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onFechar()
      if (fotos.length > 1 && e.key === 'ArrowLeft') passo(-1)
      if (fotos.length > 1 && e.key === 'ArrowRight') passo(1)
    }
    window.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function aoTocar(e) {
    toqueX.current = e.touches[0].clientX
  }

  function aoSoltar(e) {
    if (toqueX.current === null || fotos.length < 2) return
    const dx = e.changedTouches[0].clientX - toqueX.current
    toqueX.current = null
    if (Math.abs(dx) > 40) passo(dx < 0 ? 1 : -1)
  }

  return (
    <div className="modal" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="modal-caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modal-fechar" onClick={onFechar} aria-label="Fechar">
          ×
        </button>

        <div className="galeria" onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
          {fotos.length > 0 && <img src={fotos[i]} alt={produto.nome} />}
          {fotos.length > 1 && (
            <>
              <button className="seta esq" onClick={() => passo(-1)} aria-label="Foto anterior">‹</button>
              <button className="seta dir" onClick={() => passo(1)} aria-label="Próxima foto">›</button>
              <span className="contador">{i + 1}/{fotos.length}</span>
            </>
          )}
        </div>

        {fotos.length > 1 && (
          <div className="miniaturas">
            {fotos.map((url, k) => (
              <button
                key={url}
                className={`mini ${k === i ? 'ativa' : ''}`}
                onClick={() => setI(k)}
                aria-label={`Foto ${k + 1}`}
              >
                <img src={url} alt="" />
              </button>
            ))}
          </div>
        )}

        <div className="modal-info">
          <h2>{produto.nome}</h2>
          <strong>{brl(produto.preco)}</strong>
          {produto.descricao && <p>{produto.descricao}</p>}
          <a
            className="btn-whats"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
              'Olá! Tenho interesse em: ' + produto.nome
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Chamar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}