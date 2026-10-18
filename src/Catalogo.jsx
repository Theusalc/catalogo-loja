import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const WHATSAPP = '55017981312643' // troque: 55 + DDD + número, só dígitos

const semAcento = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function Catalogo() {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase
        .from('produtos')
        .select('id, nome, descricao, preco, foto_url, categoria_id')
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
    return produtos.filter(
      (p) =>
        (categoria === 'todas' || String(p.categoria_id) === categoria) &&
        (!termo ||
          semAcento(p.nome).includes(termo) ||
          semAcento(p.descricao).includes(termo))
    )
  }, [produtos, busca, categoria])

  if (carregando) return <p className="aviso">Carregando produtos...</p>
  if (erro) return <p className="aviso">Não foi possível carregar: {erro}</p>

  return (
    <main>
      <h1>Nossos produtos</h1>

      <input
        className="busca"
        type="search"
        placeholder="Buscar produto..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

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

      {filtrados.length === 0 && (
        <p className="aviso">Nenhum produto encontrado.</p>
      )}

      <div className="grade">
        {filtrados.map((p) => (
          <article key={p.id} className="card">
            {p.foto_url && <img src={p.foto_url} alt={p.nome} />}
            <h2>{p.nome}</h2>
            <p>{p.descricao}</p>
            <strong>
              {Number(p.preco).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
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
    </main>
  )
}