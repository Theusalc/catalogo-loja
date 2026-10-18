import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Painel from './Painel'

export default function Admin() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
      email,
      password: senha,
    })
    if (error) setErro('E-mail ou senha incorretos.')
    setEntrando(false)
  }

  if (carregando) return <p className="aviso">Carregando...</p>

  if (!sessao) {
    return (
      <main className="login">
        <h1>Área da loja</h1>
        <form onSubmit={entrar}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button type="submit" disabled={entrando}>
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </main>
    )
  }

  return <Painel email={sessao.user.email} />
}