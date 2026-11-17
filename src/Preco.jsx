export const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// promoção só vale se o preço promocional for menor que o normal
export const emPromocao = (p) =>
  p.preco_promocional != null && Number(p.preco_promocional) < Number(p.preco)

export const precoFinal = (p) =>
  emPromocao(p) ? Number(p.preco_promocional) : Number(p.preco)

export const percentual = (p) =>
  Math.round((1 - Number(p.preco_promocional) / Number(p.preco)) * 100)

export function Preco({ produto }) {
  if (!emPromocao(produto)) return <strong>{brl(produto.preco)}</strong>
  return (
    <span className="preco-promo">
      <s>{brl(produto.preco)}</s>
      <strong>{brl(produto.preco_promocional)}</strong>
    </span>
  )
}

export function Selos({ produto }) {
  if (!produto.destaque && !emPromocao(produto)) return null
  return (
    <span className="selos">
      {emPromocao(produto) && (
        <span className="selo promo">-{percentual(produto)}%</span>
      )}
      {produto.destaque && <span className="selo destaque">★ Destaque</span>}
    </span>
  )
}

export function linkDoProduto(p) {
  return `${window.location.origin}/produto/${p.id}`
}

// abre o compartilhar do celular; no computador copia o link
export async function compartilhar(p) {
  const url = linkDoProduto(p)
  try {
    if (navigator.share) {
      await navigator.share({ title: p.nome + ' | Toque Feminino', url })
      return 'compartilhado'
    }
    await navigator.clipboard.writeText(url)
    return 'copiado'
  } catch (e) {
    if (e && e.name === 'AbortError') return null
    try {
      await navigator.clipboard.writeText(url)
      return 'copiado'
    } catch {
      window.prompt('Copie o link do produto:', url)
      return null
    }
  }
}
