import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import {
  BotaoAuth,
  CartaoAuth,
  Carregando,
  CodigoSeisDigitos,
  Erro,
  IconeCelular,
  IconeEscudo,
} from './Auth'

function mensagemMfa(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('invalid') || m.includes('expired'))
    return 'Código incorreto ou expirado. Espere o próximo código no app e tente de novo.'
  if (m.includes('rate') || m.includes('too many'))
    return 'Muitas tentativas. Aguarde um minuto.'
  return 'Não foi possível verificar. Tente de novo.'
}

export default function ExigeMfa({ children }) {
  const [etapa, setEtapa] = useState('carregando') // carregando | cadastrar | verificar | ok
  const [fatorId, setFatorId] = useState(null)
  const [qr, setQr] = useState(null)
  const [segredo, setSegredo] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const iniciou = useRef(false)

  async function avaliar() {
    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) return setErro(error.message)

    const { data: fatores, error: errLista } =
      await supabase.auth.mfa.listFactors()
    if (errLista) return setErro(errLista.message)

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
    avaliar()
  }, [])

  async function copiarChave() {
    try {
      await navigator.clipboard.writeText(segredo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sem acesso à área de transferência: a chave continua visível */
    }
  }

  async function confirmar(e, codigoPronto) {
    e?.preventDefault()
    const cod = (codigoPronto ?? codigo).trim()
    if (cod.length !== 6 || ocupado) return
    setErro(null)
    setOcupado(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: fatorId,
        code: cod,
      })
      if (error) {
        console.error('Erro MFA:', error)
        setCodigo('')
        setErro(mensagemMfa(error))
        setTentativa((t) => t + 1)
        return
      }
      await avaliar()
    } catch (err) {
      console.error('Excecao MFA:', err)
      setErro('Erro inesperado. Tente de novo.')
      setTentativa((t) => t + 1)
    } finally {
      setOcupado(false)
    }
  }

  if (etapa === 'ok') return children
  if (etapa === 'carregando') {
    return erro ? (
      <CartaoAuth titulo="Algo deu errado" icone={<IconeEscudo />}>
        <Erro>{erro}</Erro>
        <button type="button" className="auth-botao" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </CartaoAuth>
    ) : (
      <Carregando texto="Verificando acesso..." />
    )
  }

  const sair = (
    <button type="button" className="auth-link" onClick={() => supabase.auth.signOut()}>
      Sair e usar outra conta
    </button>
  )

  const formulario = (
    <form className="auth-form" onSubmit={confirmar}>
      <CodigoSeisDigitos
        valor={codigo}
        onChange={setCodigo}
        onCompleto={(c) => confirmar(null, c)}
        desabilitado={ocupado}
        erro={tentativa}
      />
      <Erro>{erro}</Erro>
      <BotaoAuth ocupado={ocupado} textoOcupado="Verificando..." disabled={codigo.length !== 6}>
        Confirmar
      </BotaoAuth>
    </form>
  )

  if (etapa === 'verificar') {
    return (
      <CartaoAuth
        icone={<IconeEscudo />}
        titulo="Verificação em 2 etapas"
        subtitulo="Abra o app autenticador no seu celular e digite o código de 6 dígitos da Toque Feminino."
        rodape={sair}
      >
        {formulario}
        <p className="auth-dica">O código muda a cada 30 segundos. Se errar, é só esperar o próximo.</p>
      </CartaoAuth>
    )
  }

  // etapa === 'cadastrar'
  return (
    <CartaoAuth
      icone={<IconeCelular />}
      titulo="Proteja sua conta"
      subtitulo="Ative a verificação em 2 etapas. Só precisa fazer isso uma vez."
      rodape={sair}
    >
      <ol className="passos">
        <li>
          <span className="passo-num">1</span>
          <div>
            <b>Instale um app autenticador</b>
            <small>Google Authenticator, Microsoft Authenticator, Authy ou 1Password.</small>
          </div>
        </li>
        <li>
          <span className="passo-num">2</span>
          <div>
            <b>Escaneie o QR code</b>
            <small>No app, toque em “+” e escolha ler QR code.</small>
          </div>
        </li>
      </ol>
      <div className="qr-moldura">
        <img className="qr" src={qr} alt="QR code para o app autenticador" />
      </div>
      <details className="chave-manual">
        <summary>Não consegue escanear? Use a chave</summary>
        <div className="chave-linha">
          <code className="segredo">{segredo?.match(/.{1,4}/g)?.join(' ')}</code>
          <button type="button" className="sec" onClick={copiarChave}>
            {copiado ? 'Copiada!' : 'Copiar'}
          </button>
        </div>
        <small>Guarde essa chave no seu gerenciador de senhas: ela é o seu backup se trocar de celular.</small>
      </details>
      <ol className="passos" start={3}>
        <li>
          <span className="passo-num">3</span>
          <div>
            <b>Digite o código que apareceu</b>
            <small>São 6 números que mudam a cada 30 segundos.</small>
          </div>
        </li>
      </ol>
      {formulario}
    </CartaoAuth>
  )
}
