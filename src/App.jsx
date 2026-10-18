import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const WHATSAPP = '55017981312643' // troque: 55 + DDD + número, só dígitos

export default function App() {
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    supabase
      .from('produtos')
      .select('id, nome, descricao, preco, foto_url')
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro(error.message)
        else setProdutos(data)
        setCarregando(false)
      })
  }, [])

  if (carregando) return <p className="aviso">Carregando produtos...</p>
  if (erro) return <p className="aviso">Não foi possível carregar: {erro}</p>

  return (
    <main>
      <h1>Nossos produtos</h1>
      <div className="grade">
        {produtos.map((p) => (
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