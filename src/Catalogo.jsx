
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import VoltarAoTopo from './VoltarAoTopo'
import Detalhe from './Detalhe'
import { Preco, Selos, precoFinal } from './Preco'
import Imagem from './Imagem'

const WHATSAPP = '55017981312643' // troque: 55 + DDD + número, só dígitos

const semAcento = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Catalogo() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [ordem, setOrdem] = useState('destaque')
  const { id } = useParams()
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase
        .from('produtos')
        .select(
          'id, nome, descricao, preco, preco_promocional, destaque, foto_url, fotos, categoria_id'
        )
        .order('nome'),
      supabase.from('categorias').select('id, nome').order('nome'),
    ]).then(([p, c]) => {
      if (p.error) setErro(p.error.message)
      else setProdutos(p.data)
      if (!c.error) setCategorias(c.data)
      setCarregando(false)
    })
  }, [])

  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim())
    const lista = produtos.filter(
      (p) =>
        (categoria === 'todas' || String(p.categoria_id) === categoria) &&
        (!termo ||
          semAcento(p.nome).includes(termo) ||
          semAcento(p.descricao).includes(termo))
    )
    const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')
    const comparar = {
      destaque: (a, b) => Number(b.destaque) - Number(a.destaque) || porNome(a, b),
      menor: (a, b) => precoFinal(a) - precoFinal(b) || porNome(a, b),
      maior: (a, b) => precoFinal(b) - precoFinal(a) || porNome(a, b),
      nome: porNome,
    }[ordem]
    return [...lista].sort(comparar)
  }, [produtos, busca, categoria, ordem])

  const aberto = id ? produtos.find((p) => String(p.id) === id) : null
  const abrir = (p) => navigate(`/produto/${p.id}`)
  const fechar = () => navigate('/')

  // os cards aparecem suavemente conforme entram na tela
  useEffect(() => {
    if (carregando) return
    const itens = document.querySelectorAll('.card.revelar:not(.dentro)')
    if (!('IntersectionObserver' in window)) {
      itens.forEach((el) => el.classList.add('dentro'))
      return
    }
    const obs = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('dentro')
            obs.unobserve(en.target)
          }
        }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
    )
    itens.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [carregando, filtrados, ordem, categoria])

  if (carregando)
    return (
      <main className="catalogo" aria-busy="true">
        <header className="topo-loja">
          <h1>
            <img src="/logo-toque-feminino.png" alt="Toque Feminino" />
          </h1>
        </header>
        <div className="grade">
          {Array.from({ length: 8 }, (_, k) => (
            <div key={k} className="card esqueleto" aria-hidden="true">
              <div className="foto" />
              <span className="linha-esq" />
              <span className="linha-esq curta" />
            </div>
          ))}
        </div>
      </main>
    )
  if (erro) return <p className="aviso">Não foi possível carregar: {erro}</p>

  return (
    <main className="catalogo">
      <header className="topo-loja">
        <h1>
          <img src="/logo-toque-feminino.png" alt="Toque Feminino" />
        </h1>
      </header>

      <div className="barra">
      <input
        className="busca"
        type="search"
        placeholder="Buscar produto..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <label className="ordenar">
        Ordenar por
        <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
          <option value="destaque">Em destaque</option>
          <option value="menor">Menor preço</option>
          <option value="maior">Maior preço</option>
          <option value="nome">Nome (A–Z)</option>
        </select>
      </label>

      {categorias.length > 0 && (
        <div className="filtros">
          <button
            className={`chip ${categoria === 'todas' ? 'ativo' : ''}`}
            onClick={() => setCategoria('todas')}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              className={`chip ${categoria === String(c.id) ? 'ativo' : ''}`}
              onClick={() => setCategoria(String(c.id))}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}
      </div>

      {id && !aberto && (
        <p className="aviso">
          Produto não encontrado ou indisponível.{' '}
          <button className="sec" onClick={fechar}>Ver catálogo</button>
        </p>
      )}

      {filtrados.length === 0 && (
        <p className="aviso">Nenhum produto encontrado.</p>
      )}

      <div className="grade" key={`${ordem}-${categoria}`}>
        {filtrados.map((p, n) => (
          <article
            key={p.id}
            className="card revelar"
            style={{ '--i': n % 4 }}
          >
            <button
              type="button"
              className="foto"
              onClick={() => abrir(p)}
              aria-label={`Ver detalhes de ${p.nome}`}
            >
              {p.foto_url && (
                <Imagem src={p.foto_url} alt={p.nome} loading="lazy" />
              )}
              <Selos produto={p} />
              {p.fotos?.length > 1 && (
                <span className="qtd">{p.fotos.length} fotos</span>
              )}
            </button>
            <h2 onClick={() => abrir(p)}>{p.nome}</h2>
            <p>{p.descricao}</p>
            <Preco produto={p} />
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                'Olá! Tenho interesse em: ' + p.nome
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Chamar no WhatsApp
            </a>
          </article>
        ))}
      </div>

      {aberto && (
        <Detalhe
          produto={aberto}
          whatsapp={WHATSAPP}
          onFechar={fechar}
        />
      )}

      <VoltarAoTopo />
    </main>
  )
}