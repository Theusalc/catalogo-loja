// Worker da Toque Feminino.
// Serve o site (arquivos da pasta dist) e, nas páginas "/" e "/produto/:id",
// acrescenta as tags Open Graph no HTML. Assim, quando alguém cola o link no
// WhatsApp/Instagram, aparece a foto, o nome e o preço do produto.
// Qualquer problema aqui cai no site normal (nunca derruba o catálogo).

const NOME_LOJA = 'Toque Feminino'

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function resumo(texto, max = 160) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

async function buscarProduto(env, id) {
  const url =
    `${env.SUPABASE_URL}/rest/v1/produtos` +
    `?id=eq.${id}&select=nome,descricao,preco,preco_promocional,foto_url&limit=1`
  const r = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    signal: AbortSignal.timeout(3000),
  })
  if (!r.ok) return null
  const lista = await r.json()
  return lista[0] ?? null
}

function metaTags({ titulo, descricao, imagem, url, tipo }) {
  return [
    `<meta name="description" content="${esc(descricao)}">`,
    `<meta property="og:site_name" content="${NOME_LOJA}">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:type" content="${tipo}">`,
    `<meta property="og:title" content="${esc(titulo)}">`,
    `<meta property="og:description" content="${esc(descricao)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(imagem)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(titulo)}">`,
    `<meta name="twitter:description" content="${esc(descricao)}">`,
    `<meta name="twitter:image" content="${esc(imagem)}">`,
  ].join('\n')
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      const ehProduto = url.pathname.match(/^\/produto\/(\d+)\/?$/)
      const ehHome = url.pathname === '/'
      if (request.method !== 'GET' || (!ehProduto && !ehHome)) {
        return env.ASSETS.fetch(request)
      }

      let dados = {
        titulo: `${NOME_LOJA} | Catálogo`,
        descricao: 'Veja o catálogo da Toque Feminino e chame no WhatsApp.',
        imagem: `${url.origin}/og-padrao.png`,
        url: `${url.origin}/`,
        tipo: 'website',
      }

      if (ehProduto) {
        const p = await buscarProduto(env, ehProduto[1]).catch(() => null)
        if (p) {
          const promo =
            p.preco_promocional != null && Number(p.preco_promocional) < Number(p.preco)
          const preco = promo
            ? `De ${brl(p.preco)} por ${brl(p.preco_promocional)}`
            : brl(p.preco)
          dados = {
            titulo: `${p.nome} | ${NOME_LOJA}`,
            descricao: resumo(`${preco}${p.descricao ? ' · ' + p.descricao : ''}`),
            imagem: p.foto_url || dados.imagem,
            url: `${url.origin}/produto/${ehProduto[1]}`,
            tipo: 'website',
          }
        }
      }

      // o site é uma página única: o HTML base é sempre o da raiz
      const base = await env.ASSETS.fetch(new Request(`${url.origin}/`, request))
      const tags = metaTags(dados)
      const resposta = new HTMLRewriter()
        .on('title', { element: (e) => e.setInnerContent(dados.titulo) })
        .on('meta[name="description"]', { element: (e) => e.remove() })
        .on('head', { element: (e) => e.append(tags, { html: true }) })
        .transform(base)

      const out = new Response(resposta.body, resposta)
      out.headers.set('Cache-Control', 'public, max-age=60')
      return out
    } catch {
      return env.ASSETS.fetch(request)
    }
  },
}
