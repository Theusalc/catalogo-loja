import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const VAZIO = {
  id: null, codigo: '', nome: '', descricao: '',
  preco: '', categoria_id: '', foto_url: '', ativo: true,
}

const brl = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function reduzir(arquivo, max = 800) {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.8))
}

function FormProduto({ inicial, categorias, onSalvo, onCancelar }) {
  const [f, setF] = useState({
    ...inicial,
    preco: inicial.preco === '' ? '' : String(inicial.preco).replace('.', ','),
    categoria_id: inicial.categoria_id ?? '',
    codigo: inicial.codigo ?? '',
    descricao: inicial.descricao ?? '',
    foto_url: inicial.foto_url ?? '',
  })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value })

  async function salvar(e) {
    e.preventDefault()
    setErro(null)
    const preco = Number(f.preco.replace(',', '.'))
    if (Number.isNaN(preco)) return setErro('Preço inválido.')
    setSalvando(true)

    let foto_url = f.foto_url || null
    if (arquivo) {
      const blob = await reduzir(arquivo)
      const nome = `${Date.now()}-${(f.codigo || 'produto').replace(/[^a-zA-Z0-9_-]/g, '')}.jpg`
      const { error: errUp } = await supabase.storage
        .from('fotos')
        .upload(nome, blob, { contentType: 'image/jpeg' })
      if (errUp) {
        setSalvando(false)
        return setErro('Erro ao enviar a foto: ' + errUp.message)
      }
      foto_url = supabase.storage.from('fotos').getPublicUrl(nome).data.publicUrl
    }

    const dados = {
      codigo: f.codigo.trim() || null,
      nome: f.nome.trim(),
      descricao: f.descricao.trim() || null,
      preco,
      categoria_id: f.categoria_id || null,
      foto_url,
      ativo: f.ativo,
    }
    const { error } = f.id
      ? await supabase.from('produtos').update(dados).eq('id', f.id)
      : await supabase.from('produtos').insert(dados)

    setSalvando(false)
    if (error) return setErro(error.message)
    onSalvo()
  }

  return (
    <form className="form-produto" onSubmit={salvar}>
      <h2>{f.id ? 'Editar produto' : 'Novo produto'}</h2>
      <label>Nome
        <input value={f.nome} onChange={mudar('nome')} required />
      </label>
      <label>Código (opcional, único)
        <input value={f.codigo} onChange={mudar('codigo')} />
      </label>
      <label>Descrição
        <textarea rows="3" value={f.descricao} onChange={mudar('descricao')} />
      </label>
      <label>Preço (R$)
        <input inputMode="decimal" value={f.preco} onChange={mudar('preco')} required />
      </label>
      <label>Categoria
        <select value={f.categoria_id} onChange={mudar('categoria_id')}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </label>
      <label>Foto
        <input type="file" accept="image/*" onChange={(e) => setArquivo(e.target.files[0])} />
      </label>
      {(arquivo || f.foto_url) && (
        <img
          className="previa"
          src={arquivo ? URL.createObjectURL(arquivo) : f.foto_url}
          alt="Prévia"
        />
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={f.ativo}
          onChange={(e) => setF({ ...f, ativo: e.target.checked })}
        />
        Visível no catálogo
      </label>
      {erro && <p className="erro">{erro}</p>}
      <div className="acoes">
        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="sec" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}

export default function Painel({ email }) {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)

  async function carregar() {
    const [p, c] = await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('categorias').select('*').order('nome'),
    ])
    if (p.error) setMsg(p.error.message)
    else setProdutos(p.data)
    if (!c.error) setCategorias(c.data)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarAtivo(p) {
    const { error } = await supabase
      .from('produtos').update({ ativo: !p.ativo }).eq('id', p.id)
    if (error) setMsg(error.message)
    else carregar()
  }

  async function excluir(p) {
    if (!confirm(`Excluir "${p.nome}"? Não dá para desfazer.`)) return
    const { error } = await supabase.from('produtos').delete().eq('id', p.id)
    if (error) setMsg(error.message)
    else carregar()
  }

  async function novaCategoria() {
    const nome = prompt('Nome da nova categoria:')
    if (!nome || !nome.trim()) return
    const { error } = await supabase.from('categorias').insert({ nome: nome.trim() })
    if (error) setMsg(error.message)
    else carregar()
  }

  if (form) {
    return (
      <main className="painel">
        <FormProduto
          inicial={form}
          categorias={categorias}
          onCancelar={() => setForm(null)}
          onSalvo={() => { setForm(null); carregar() }}
        />
      </main>
    )
  }

  return (
    <main className="painel">
      <div className="topo">
        <h1>Painel da loja</h1>
        <button className="sec" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
      <p className="email">{email}</p>
      <div className="acoes">
        <button onClick={() => setForm(VAZIO)}>+ Novo produto</button>
        <button className="sec" onClick={novaCategoria}>+ Categoria</button>
      </div>
      {msg && <p className="erro">{msg}</p>}
      {produtos.map((p) => (
        <div key={p.id} className={`linha ${p.ativo ? '' : 'inativo'}`}>
          {p.foto_url ? <img className="miniatura" src={p.foto_url} alt="" /> : <div className="miniatura" />}
          <div className="info">
            <strong>{p.nome}</strong>
            <span>{brl(p.preco)}{p.ativo ? '' : ' · oculto'}</span>
          </div>
          <div className="acoes">
            <button className="sec" onClick={() => setForm(p)}>Editar</button>
            <button className="sec" onClick={() => alternarAtivo(p)}>
              {p.ativo ? 'Ocultar' : 'Mostrar'}
            </button>
            <button className="perigo" onClick={() => excluir(p)}>Excluir</button>
          </div>
        </div>
      ))}
    </main>
  )
}