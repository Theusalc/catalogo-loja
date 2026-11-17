import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { Preco, Selos, brl, emPromocao } from './Preco'

const MAX_FOTOS = 6

const VAZIO = {
  id: null, codigo: '', nome: '', descricao: '',
  preco: '', preco_promocional: '', destaque: false,
  categoria_id: '', foto_url: '', fotos: [], ativo: true,
}

const semAcento = (s) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// aceita "49,90", "49.90", "1.234,56" e "1234.56"
const paraNumero = (texto) => {
  let t = String(texto ?? '').trim().replace(/[^\d.,]/g, '')
  if (t === '') return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  return Number(t)
}

async function reduzir(arquivo, max = 1000) {
  const bmp = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
}

/* ---------- ícones ---------- */
const I = {
  lapis: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.500 6.500l4 4" />,
  olho: <><path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z" /><circle cx="12" cy="12" r="3" /></>,
  olhoFechado: <><path d="M3 3l18 18M10.600 6.100A9.700 9.700 0 0 1 12 6c6 0 9.500 6 9.500 6a16 16 0 0 1-3 3.600M6.600 7.600C4 9.300 2.500 12 2.500 12S6 18.500 12 18.500c1.700 0 3.100-.4 4.300-1.100" /><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200" /></>,
  lixo: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  estrela: <path d="M12 3.500l2.600 5.300 5.900.9-4.300 4.100 1 5.800L12 16.900l-5.200 2.700 1-5.800-4.300-4.100 5.900-.9z" />,
  mais: <path d="M12 5v14M5 12h14" />,
  voltar: <path d="M15 5l-7 7 7 7" />,
  esq: <path d="M14 6l-6 6 6 6" />,
  dir: <path d="M10 6l6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  foto: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10" r="1.800" /><path d="M21 16l-5-5-8 8" /></>,
  busca: <><circle cx="11" cy="11" r="6.500" /><path d="M20 20l-4.200-4.200" /></>,
  tag: <><path d="M3.500 12.500V4h8.500l8.500 8.500-8.500 8.500z" /><circle cx="8" cy="8.500" r="1.400" /></>,
  sair: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" />,
}
function Icone({ nome, tam = 18, cheio = false }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} aria-hidden="true"
      fill={cheio ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round">
      {I[nome]}
    </svg>
  )
}

/* ---------- peças reutilizáveis ---------- */
function Chave({ ligado, onChange, titulo, descricao }) {
  return (
    <label className="pn-chave">
      <span className="pn-chave-texto">
        <b>{titulo}</b>
        {descricao && <small>{descricao}</small>}
      </span>
      <input type="checkbox" checked={ligado} onChange={(e) => onChange(e.target.checked)} />
      <span className="pn-chave-trilho" aria-hidden="true"><span /></span>
    </label>
  )
}

function Aviso({ aviso }) {
  if (!aviso) return null
  return (
    <div className={`pn-toast ${aviso.tipo}`} role="status" key={aviso.id}>
      {aviso.texto}
    </div>
  )
}

function Confirmar({ dados, onFechar }) {
  if (!dados) return null
  return (
    <div className="pn-dialogo-fundo" onClick={onFechar}>
      <div className="pn-dialogo" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="pn-dialogo-icone"><Icone nome="lixo" tam={24} /></div>
        <h3>{dados.titulo}</h3>
        <p>{dados.texto}</p>
        <div className="pn-dialogo-acoes">
          <button type="button" className="pn-btn sec" onClick={onFechar} autoFocus>Cancelar</button>
          <button type="button" className="pn-btn perigo" onClick={() => { dados.aoConfirmar(); onFechar() }}>
            {dados.botao}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- formulário do produto ---------- */
function FormProduto({ inicial, categorias, onSalvo, onCancelar, onNovaCategoria }) {
  const [f, setF] = useState({
    ...inicial,
    preco: inicial.preco === '' ? '' : String(inicial.preco).replace('.', ','),
    categoria_id: inicial.categoria_id ?? '',
    codigo: inicial.codigo ?? '',
    preco_promocional:
      inicial.preco_promocional == null ? '' : String(inicial.preco_promocional).replace('.', ','),
    destaque: !!inicial.destaque,
    descricao: inicial.descricao ?? '',
  })
  // cada item: { url, previa } (já enviada) ou { arquivo, previa } (nova)
  const [fotos, setFotos] = useState(() => {
    const atuais = inicial.fotos?.length ? inicial.fotos : inicial.foto_url ? [inicial.foto_url] : []
    return atuais.map((url) => ({ url, previa: url }))
  })
  const [salvando, setSalvando] = useState(null) // null | texto do progresso
  const [erro, setErro] = useState(null)
  const [arrastando, setArrastando] = useState(false)
  const [novaCat, setNovaCat] = useState(null) // null | texto
  const seletor = useRef(null)

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value })
  const preco = paraNumero(f.preco)
  const promo = paraNumero(f.preco_promocional)
  const promoValida = promo != null && preco != null && promo > 0 && promo < preco
  const desconto = promoValida ? Math.round((1 - promo / preco) * 100) : null

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  function adicionarArquivos(lista) {
    const imagens = Array.from(lista).filter((a) => a.type.startsWith('image/'))
    if (!imagens.length) return
    const novos = imagens.map((arquivo) => ({ arquivo, previa: URL.createObjectURL(arquivo) }))
    setFotos((atual) => {
      const junto = [...atual, ...novos]
      if (junto.length > MAX_FOTOS) setErro(`Máximo de ${MAX_FOTOS} fotos por produto.`)
      return junto.slice(0, MAX_FOTOS)
    })
  }

  const remover = (i) => setFotos((l) => l.filter((_, k) => k !== i))
  const tornarCapa = (i) => setFotos((l) => [l[i], ...l.filter((_, k) => k !== i)])
  function mover(i, dir) {
    setFotos((l) => {
      const j = i + dir
      if (j < 0 || j >= l.length) return l
      const c = [...l]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })
  }

  async function criarCategoria() {
    const nome = (novaCat ?? '').trim()
    if (!nome) return setNovaCat(null)
    const id = await onNovaCategoria(nome)
    if (id) setF((atual) => ({ ...atual, categoria_id: String(id) }))
    setNovaCat(null)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro(null)
    if (!f.nome.trim()) return setErro('Dê um nome ao produto.')
    if (preco == null || Number.isNaN(preco) || preco <= 0) return setErro('Informe um preço válido, por exemplo 49,90.')
    if (f.preco_promocional.trim() && !promoValida)
      return setErro('O preço promocional precisa ser menor que o preço normal.')

    const novas = fotos.filter((x) => !x.url).length
    let enviadas = 0
    setSalvando(novas ? `Enviando fotos 0/${novas}...` : 'Salvando...')

    const urls = []
    for (const item of fotos) {
      if (item.url) { urls.push(item.url); continue }
      const blob = await reduzir(item.arquivo)
      const nome = `${Date.now()}-${urls.length}-produto.jpg`
      const { error: errUp } = await supabase.storage.from('fotos').upload(nome, blob, { contentType: 'image/jpeg' })
      if (errUp) {
        setSalvando(null)
        return setErro('Não foi possível enviar uma das fotos. Tente de novo.')
      }
      urls.push(supabase.storage.from('fotos').getPublicUrl(nome).data.publicUrl)
      enviadas += 1
      setSalvando(`Enviando fotos ${enviadas}/${novas}...`)
    }
    setSalvando('Salvando...')

    const dados = {
      nome: f.nome.trim(),
      descricao: f.descricao.trim() || null,
      preco,
      preco_promocional: promoValida ? promo : null,
      destaque: f.destaque,
      categoria_id: f.categoria_id || null,
      fotos: urls,
      foto_url: urls[0] ?? null,
      ativo: f.ativo,
    }
    const { error } = f.id
      ? await supabase.from('produtos').update(dados).eq('id', f.id)
      : await supabase.from('produtos').insert(dados)

    setSalvando(null)
    if (error) return setErro('Não foi possível salvar: ' + error.message)
    onSalvo(f.id ? 'Alterações salvas.' : 'Produto cadastrado!')
  }

  const previa = {
    nome: f.nome.trim() || 'Nome do produto',
    preco: preco ?? 0,
    preco_promocional: promoValida ? promo : null,
    destaque: f.destaque,
  }

  return (
    <form className="pn-form" onSubmit={salvar}>
      <header className="pn-form-topo">
        <button type="button" className="pn-icone-btn" onClick={onCancelar} aria-label="Voltar para a lista">
          <Icone nome="voltar" tam={20} />
        </button>
        <div>
          <h1>{f.id ? 'Editar produto' : 'Novo produto'}</h1>
          <p>{f.id ? <>Código <span className="pn-codigo">{f.codigo}</span></> : 'O código é gerado automaticamente ao salvar.'}</p>
        </div>
      </header>

      <div className="pn-form-grade">
        <div className="pn-form-coluna">
          <section className="pn-secao">
            <h2>Informações</h2>
            <label className="pn-campo">
              <span>Nome do produto</span>
              <input value={f.nome} onChange={mudar('nome')} placeholder="Ex.: Urso de pelúcia 30 cm" maxLength={80} required autoFocus={!f.id} />
            </label>
            <label className="pn-campo">
              <span>Descrição <small>{f.descricao.length}/400</small></span>
              <textarea rows="4" value={f.descricao} onChange={mudar('descricao')} maxLength={400}
                placeholder="Tamanho, material, cores disponíveis..." />
            </label>
          </section>

          <section className="pn-secao">
            <h2>Preço</h2>
            <div className="pn-linha-2">
              <label className="pn-campo">
                <span>Preço</span>
                <div className="pn-moeda">
                  <i>R$</i>
                  <input inputMode="decimal" value={f.preco} onChange={mudar('preco')} placeholder="0,00" required />
                </div>
              </label>
              <label className="pn-campo">
                <span>Promocional <small>opcional</small></span>
                <div className={`pn-moeda ${f.preco_promocional && !promoValida ? 'invalido' : ''}`}>
                  <i>R$</i>
                  <input inputMode="decimal" value={f.preco_promocional} onChange={mudar('preco_promocional')} placeholder="—" />
                </div>
              </label>
            </div>
            {desconto != null && (
              <p className="pn-promo-info">
                <span className="selo promo">-{desconto}%</span>
                De <s>{brl(preco)}</s> por <b>{brl(promo)}</b>
              </p>
            )}
            {f.preco_promocional && !promoValida && (
              <p className="pn-campo-erro">Precisa ser menor que o preço normal.</p>
            )}
          </section>

          <section className="pn-secao">
            <h2>Fotos <small>{fotos.length}/{MAX_FOTOS}</small></h2>
            <div className="pn-fotos">
              {fotos.map((it, i) => (
                <figure key={it.previa} className="pn-foto">
                  <img src={it.previa} alt={`Foto ${i + 1}`} />
                  {i === 0 && <span className="pn-capa">Capa</span>}
                  <button type="button" className="pn-foto-x" onClick={() => remover(i)} aria-label="Remover foto">
                    <Icone nome="x" tam={14} />
                  </button>
                  <div className="pn-foto-acoes">
                    <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Mover para a esquerda"><Icone nome="esq" tam={15} /></button>
                    {i !== 0 && <button type="button" className="pn-foto-capa" onClick={() => tornarCapa(i)}>Capa</button>}
                    <button type="button" disabled={i === fotos.length - 1} onClick={() => mover(i, 1)} aria-label="Mover para a direita"><Icone nome="dir" tam={15} /></button>
                  </div>
                </figure>
              ))}
              {fotos.length < MAX_FOTOS && (
                <button
                  type="button"
                  className={`pn-soltar ${arrastando ? 'ativo' : ''} ${fotos.length ? '' : 'vazio'}`}
                  onClick={() => seletor.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => { e.preventDefault(); setArrastando(false); adicionarArquivos(e.dataTransfer.files) }}
                >
                  <Icone nome="foto" tam={26} />
                  <b>{fotos.length ? 'Adicionar' : 'Adicionar fotos'}</b>
                  {!fotos.length && <small>Toque para escolher ou arraste aqui. A primeira foto vira a capa.</small>}
                </button>
              )}
            </div>
            <input ref={seletor} type="file" accept="image/*" multiple hidden
              onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = '' }} />
          </section>
        </div>

        <div className="pn-form-coluna lateral">
          <section className="pn-secao">
            <h2>Organização</h2>
            <label className="pn-campo">
              <span>Categoria</span>
              {novaCat === null ? (
                <div className="pn-cat-linha">
                  <select value={f.categoria_id} onChange={mudar('categoria_id')}>
                    <option value="">Sem categoria</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <button type="button" className="pn-icone-btn" onClick={() => setNovaCat('')} aria-label="Nova categoria" title="Nova categoria">
                    <Icone nome="mais" />
                  </button>
                </div>
              ) : (
                <div className="pn-cat-linha">
                  <input autoFocus value={novaCat} onChange={(e) => setNovaCat(e.target.value)} placeholder="Nome da categoria"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); criarCategoria() } if (e.key === 'Escape') setNovaCat(null) }} />
                  <button type="button" className="pn-btn" onClick={criarCategoria}>Criar</button>
                </div>
              )}
            </label>
            <Chave ligado={f.ativo} onChange={(v) => setF({ ...f, ativo: v })}
              titulo="Visível no catálogo" descricao={f.ativo ? 'Clientes podem ver este produto.' : 'Escondido dos clientes.'} />
            <Chave ligado={f.destaque} onChange={(v) => setF({ ...f, destaque: v })}
              titulo="Produto em destaque" descricao="Aparece primeiro, com selo ★." />
          </section>

          <section className="pn-secao pn-previa-secao">
            <h2>Prévia no catálogo</h2>
            <div className="card pn-previa">
              <div className="foto">
                {fotos[0] ? <img src={fotos[0].previa} alt="" /> : <span className="pn-previa-vazia"><Icone nome="foto" tam={30} /></span>}
                <Selos produto={previa} />
              </div>
              <h2>{previa.nome}</h2>
              <Preco produto={previa} />
            </div>
          </section>
        </div>
      </div>

      {erro && <p className="pn-erro" role="alert" key={erro}>{erro}</p>}

      <div className="pn-barra-salvar">
        <button type="button" className="pn-btn sec" onClick={onCancelar} disabled={!!salvando}>Cancelar</button>
        <button type="submit" className="pn-btn" disabled={!!salvando}>
          {salvando && <span className="girando" aria-hidden="true" />}
          {salvando || (f.id ? 'Salvar alterações' : 'Cadastrar produto')}
        </button>
      </div>
    </form>
  )
}

/* ---------- lista de produtos ---------- */
const FILTROS = [
  ['todos', 'Todos'],
  ['visiveis', 'Visíveis'],
  ['ocultos', 'Ocultos'],
  ['promo', 'Em promoção'],
  ['destaque', 'Destaques'],
]

export default function Painel({ email }) {
  const [produtos, setProdutos] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [form, setForm] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [catAberta, setCatAberta] = useState(false)
  const [novaCat, setNovaCat] = useState('')

  const tempoAviso = useRef(null)
  function avisar(texto, tipo = 'ok') {
    setAviso({ texto, tipo, id: Date.now() })
    clearTimeout(tempoAviso.current)
    tempoAviso.current = setTimeout(() => setAviso(null), 2800)
  }

  async function carregar() {
    const [p, c] = await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('categorias').select('*').order('nome'),
    ])
    if (p.error) avisar('Erro ao carregar: ' + p.error.message, 'erro')
    else setProdutos(p.data)
    if (!c.error) setCategorias(c.data)
  }

  useEffect(() => { carregar() }, [])

  async function atualizar(p, campos, texto) {
    // muda na tela na hora e confirma no banco
    setProdutos((l) => l.map((x) => (x.id === p.id ? { ...x, ...campos } : x)))
    const { error } = await supabase.from('produtos').update(campos).eq('id', p.id)
    if (error) { avisar('Não foi possível alterar: ' + error.message, 'erro'); carregar() }
    else avisar(texto)
  }

  function pedirExclusao(p) {
    setConfirmar({
      titulo: 'Excluir produto?',
      texto: `"${p.nome}" será apagado do catálogo. Isso não pode ser desfeito. Se quiser só esconder, use o botão de olho.`,
      botao: 'Excluir',
      aoConfirmar: async () => {
        const { error } = await supabase.from('produtos').delete().eq('id', p.id)
        if (error) avisar('Não foi possível excluir: ' + error.message, 'erro')
        else { avisar('Produto excluído.'); carregar() }
      },
    })
  }

  async function criarCategoria(nome) {
    const { data, error } = await supabase.from('categorias').insert({ nome }).select('id').single()
    if (error) { avisar('Não foi possível criar a categoria: ' + error.message, 'erro'); return null }
    avisar(`Categoria "${nome}" criada.`)
    await carregar()
    return data.id
  }

  const nomeCategoria = useMemo(
    () => Object.fromEntries(categorias.map((c) => [String(c.id), c.nome])),
    [categorias]
  )

  const lista = useMemo(() => {
    if (!produtos) return []
    const termo = semAcento(busca.trim())
    return produtos.filter((p) => {
      if (filtro === 'visiveis' && !p.ativo) return false
      if (filtro === 'ocultos' && p.ativo) return false
      if (filtro === 'promo' && !emPromocao(p)) return false
      if (filtro === 'destaque' && !p.destaque) return false
      return !termo || semAcento(p.nome).includes(termo) || semAcento(p.codigo).includes(termo)
    })
  }, [produtos, busca, filtro])

  const contagem = useMemo(() => {
    const l = produtos ?? []
    return {
      todos: l.length,
      visiveis: l.filter((p) => p.ativo).length,
      ocultos: l.filter((p) => !p.ativo).length,
      promo: l.filter(emPromocao).length,
      destaque: l.filter((p) => p.destaque).length,
    }
  }, [produtos])

  if (form) {
    return (
      <main className="pn">
        <FormProduto
          inicial={form}
          categorias={categorias}
          onCancelar={() => setForm(null)}
          onNovaCategoria={criarCategoria}
          onSalvo={(texto) => { setForm(null); avisar(texto); carregar() }}
        />
        <Aviso aviso={aviso} />
      </main>
    )
  }

  return (
    <main className="pn">
      <header className="pn-topo">
        <img src="/logo-toque-feminino.png" alt="Toque Feminino" className="pn-logo" />
        <div className="pn-conta">
          <span className="pn-avatar" aria-hidden="true">{(email || '?')[0].toUpperCase()}</span>
          <span className="pn-email">{email}</span>
          <button className="pn-icone-btn" onClick={() => supabase.auth.signOut()} aria-label="Sair" title="Sair">
            <Icone nome="sair" />
          </button>
        </div>
      </header>

      <div className="pn-titulo">
        <div>
          <h1>Produtos</h1>
          <p>Cadastre, edite e organize o que aparece no catálogo.</p>
        </div>
        <div className="pn-titulo-acoes">
          <button className="pn-btn sec" onClick={() => setCatAberta(true)}>
            <Icone nome="tag" /> Categorias
          </button>
          <button className="pn-btn" onClick={() => setForm(VAZIO)}>
            <Icone nome="mais" /> Novo produto
          </button>
        </div>
      </div>

      <div className="pn-resumo">
        <div><b>{contagem.todos}</b><span>produtos</span></div>
        <div><b>{contagem.visiveis}</b><span>visíveis</span></div>
        <div><b>{contagem.promo}</b><span>em promoção</span></div>
        <div><b>{contagem.destaque}</b><span>destaques</span></div>
      </div>

      <div className="pn-ferramentas">
        <label className="pn-busca">
          <Icone nome="busca" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou código" />
        </label>
        <div className="pn-filtros" role="tablist">
          {FILTROS.map(([v, rotulo]) => (
            <button key={v} role="tab" aria-selected={filtro === v}
              className={`pn-filtro ${filtro === v ? 'ativo' : ''}`} onClick={() => setFiltro(v)}>
              {rotulo} <span>{contagem[v]}</span>
            </button>
          ))}
        </div>
      </div>

      {produtos === null ? (
        <div className="pn-lista">
          {[0, 1, 2, 3].map((k) => <div key={k} className="pn-item pn-item-esq" />)}
        </div>
      ) : lista.length === 0 ? (
        <div className="pn-vazio">
          <Icone nome="foto" tam={34} />
          <b>{produtos.length ? 'Nada encontrado' : 'Nenhum produto ainda'}</b>
          <span>{produtos.length ? 'Tente outra busca ou filtro.' : 'Cadastre o primeiro produto da loja.'}</span>
          {!produtos.length && <button className="pn-btn" onClick={() => setForm(VAZIO)}><Icone nome="mais" /> Novo produto</button>}
        </div>
      ) : (
        <div className="pn-lista">
          {lista.map((p, n) => (
            <article key={p.id} className={`pn-item ${p.ativo ? '' : 'oculto'}`} style={{ '--i': Math.min(n, 10) }}>
              <button className="pn-item-foto" onClick={() => setForm(p)} aria-label={`Editar ${p.nome}`}>
                {p.foto_url ? <img src={p.foto_url} alt="" loading="lazy" /> : <Icone nome="foto" tam={22} />}
              </button>
              <div className="pn-item-info" onClick={() => setForm(p)}>
                <strong>{p.nome}</strong>
                <div className="pn-item-meta">
                  <span className="pn-codigo">{p.codigo}</span>
                  {p.categoria_id && <span>{nomeCategoria[String(p.categoria_id)]}</span>}
                </div>
                <div className="pn-item-preco">
                  <Preco produto={p} />
                  {emPromocao(p) && <span className="pn-tag promo">Promoção</span>}
                  {!p.ativo && <span className="pn-tag oculto">Oculto</span>}
                </div>
              </div>
              <div className="pn-item-acoes">
                <button className={`pn-icone-btn estrela ${p.destaque ? 'ligado' : ''}`}
                  onClick={() => atualizar(p, { destaque: !p.destaque }, p.destaque ? 'Removido dos destaques.' : 'Marcado como destaque ★')}
                  aria-label={p.destaque ? 'Tirar dos destaques' : 'Marcar como destaque'} title={p.destaque ? 'Tirar dos destaques' : 'Marcar como destaque'}>
                  <Icone nome="estrela" cheio={p.destaque} />
                </button>
                <button className="pn-icone-btn"
                  onClick={() => atualizar(p, { ativo: !p.ativo }, p.ativo ? 'Produto escondido do catálogo.' : 'Produto visível no catálogo.')}
                  aria-label={p.ativo ? 'Esconder do catálogo' : 'Mostrar no catálogo'} title={p.ativo ? 'Esconder do catálogo' : 'Mostrar no catálogo'}>
                  <Icone nome={p.ativo ? 'olho' : 'olhoFechado'} />
                </button>
                <button className="pn-icone-btn" onClick={() => setForm(p)} aria-label="Editar" title="Editar">
                  <Icone nome="lapis" />
                </button>
                <button className="pn-icone-btn perigo" onClick={() => pedirExclusao(p)} aria-label="Excluir" title="Excluir">
                  <Icone nome="lixo" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {catAberta && (
        <div className="pn-dialogo-fundo" onClick={() => setCatAberta(false)}>
          <div className="pn-dialogo pn-cats" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="pn-dialogo-topo">
              <h3>Categorias</h3>
              <button className="pn-icone-btn" onClick={() => setCatAberta(false)} aria-label="Fechar"><Icone nome="x" /></button>
            </div>
            <ul>
              {categorias.map((c) => (
                <li key={c.id}>
                  <span>{c.nome}</span>
                  <small>{(produtos ?? []).filter((p) => String(p.categoria_id) === String(c.id)).length} produtos</small>
                </li>
              ))}
              {!categorias.length && <li className="pn-cats-vazio">Nenhuma categoria ainda.</li>}
            </ul>
            <form className="pn-cat-linha" onSubmit={async (e) => {
              e.preventDefault()
              const nome = novaCat.trim()
              if (!nome) return
              if (await criarCategoria(nome)) setNovaCat('')
            }}>
              <input value={novaCat} onChange={(e) => setNovaCat(e.target.value)} placeholder="Nova categoria" />
              <button type="submit" className="pn-btn" disabled={!novaCat.trim()}>Adicionar</button>
            </form>
          </div>
        </div>
      )}

      <Confirmar dados={confirmar} onFechar={() => setConfirmar(null)} />
      <Aviso aviso={aviso} />
    </main>
  )
}
