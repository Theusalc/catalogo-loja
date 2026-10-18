import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'

export default function ExigeMfa({ children }) {
  const [etapa, setEtapa] = useState('carregando') // carregando | cadastrar | verificar | ok
  const [fatorId, setFatorId] = useState(null)
  const [qr, setQr] = useState(null)
  const [segredo, setSegredo] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [debug, setDebug] = useState('')
  const iniciou = useRef(false)

  async function avaliar(origem) {
    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) return setErro(error.message)

    const { data: fatores, error: errLista } =
      await supabase.auth.mfa.listFactors()
    if (errLista) return setErro(errLista.message)

    const resumo =
      origem +
      ': nivel atual=' + data.currentLevel +
      ', proximo=' + data.nextLevel +
      ', fatores=' +
      (fatores.all.map((f) => f.factor_type + '/' + f.status).join(', ') || 'nenhum')
    console.log(resumo)
    setDebug(resumo)

    if (data.currentLevel === 'aal2') return setEtapa('ok')

    // listFactors().totp traz só os fatores já verificados
    if (fatores.totp.length > 0) {
      setFatorId(fatores.totp[0].id)
      return setEtapa('verificar')
    }

    // sem fator verificado: limpa tentativas pendentes e inicia um cadastro novo
    for (const f of fatores.all.filter((x) => x.status === 'unverified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data: novo, error: errEnroll } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Celular da loja ' + Date.now(),
    })
    if (errEnroll) return setErro(errEnroll.message)
    setFatorId(novo.id)
    setQr(novo.totp.qr_code)
    setSegredo(novo.totp.secret)
    setEtapa('cadastrar')
  }

  useEffect(() => {
    if (iniciou.current) return
    iniciou.current = true
    avaliar('inicio')
  }, [])

  async function confirmar(e) {
    e.preventDefault()
    setErro(null)
    setOcupado(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: fatorId,
        code: codigo.trim(),
      })
      if (error) {
        console.error('Erro MFA:', error)
        setCodigo('')
        setErro('Não foi possível verificar: ' + error.message)
        return
      }
      await avaliar('apos verificar')
    } catch (err) {
      console.error('Excecao MFA:', err)
      setErro('Erro inesperado: ' + err.message)
    } finally {
      setOcupado(false)
    }
  }

  if (etapa === 'ok') return children
  if (etapa === 'carregando') {
    return erro ? (
      <p className="erro aviso">{erro}</p>
    ) : (
      <p className="aviso">Carregando...</p>
    )
  }

  return (
    <main className="login">
      <h1>
        {etapa === 'cadastrar'
          ? 'Ativar verificação em 2 etapas'
          : 'Verificação em 2 etapas'}
      </h1>
      {etapa === 'cadastrar' && (
        <>
          <p>
            1. Abra um app autenticador (Google Authenticator, Authy,
            1Password...) e escaneie o QR code.
          </p>
          <img className="qr" src={qr} alt="QR code para o app autenticador" />
          <p>Se não conseguir escanear, digite esta chave no app:</p>
          <p className="segredo">{segredo}</p>
          <p>Guarde essa chave no seu gerenciador de senhas: é o seu backup.</p>
          <p>2. Digite o código de 6 dígitos que o app mostrar:</p>
        </>
      )}
      {etapa === 'verificar' && (
        <p>Digite o código de 6 dígitos do seu app autenticador.</p>
      )}
      <form onSubmit={confirmar}>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          required
        />
        {erro && <p className="erro">{erro}</p>}
        <button type="submit" disabled={ocupado || codigo.length !== 6}>
          {ocupado ? 'Verificando...' : 'Confirmar'}
        </button>
      </form>
      <button type="button" className="sec" onClick={() => supabase.auth.signOut()}>
        Sair
      </button>
    </main>
  )
}