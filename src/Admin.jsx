import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Painel from './Painel'
import ExigeMfa from './ExigeMfa'
import { BotaoAuth, CartaoAuth, Carregando, Erro, IconeCadeado } from './Auth'

function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado.'
  if (m.includes('rate') || m.includes('too many')) return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  if (m.includes('fetch') || m.includes('network')) return 'Sem conexão com o servidor. Confira a internet.'
  return 'Não foi possível entrar. Tente de novo.'
}

export default function Admin() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState(null)
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => subscription.unsubscribe()
  }, [])

  async function entrar(e) {
    e.preventDefault()
    setErro(null)
    setEntrando(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    if (error) {
      setErro(mensagemDeErro(error))
      setSenha('')
    }
    setEntrando(false)
  }

  if (carregando) return <Carregando />

  if (!sessao) {
    return (
      <CartaoAuth
        icone={<IconeCadeado />}
        titulo="Área da loja"
        subtitulo="Entre para cadastrar e editar os produtos do catálogo."
        rodape={<Link to="/">← Voltar ao catálogo</Link>}
      >
        <form className="auth-form" onSubmit={entrar}>
          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              required
              autoFocus
            />
          </label>
          <label className="campo">
            <span>Senha</span>
            <div className="campo-senha">
              <input
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                required
              />
              <button
                type="button"
                className="ver-senha"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                title={verSenha ? 'Esconder senha' : 'Mostrar senha'}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z" fill="none" stroke="currentColor" strokeWidth="1.700" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.700" />
                  {verSenha && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" />}
                </svg>
              </button>
            </div>
          </label>
          <Erro>{erro}</Erro>
          <BotaoAuth ocupado={entrando} textoOcupado="Entrando...">
            Entrar
          </BotaoAuth>
        </form>
      </CartaoAuth>
    )
  }

  return (
    <ExigeMfa>
      <Painel email={sessao.user.email} />
    </ExigeMfa>
  )
}
