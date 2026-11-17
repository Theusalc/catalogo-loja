import { useEffect, useRef, useState } from 'react'

// moldura das telas de acesso: fundo suave, logo e cartão central
export function CartaoAuth({ icone, titulo, subtitulo, children, rodape }) {
  return (
    <main className="auth">
      <div className="auth-fundo" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="auth-cartao">
        <img className="auth-logo" src="/logo-toque-feminino.png" alt="Toque Feminino" />
        {icone && <div className="auth-icone" aria-hidden="true">{icone}</div>}
        <h1>{titulo}</h1>
        {subtitulo && <p className="auth-sub">{subtitulo}</p>}
        {children}
      </div>
      {rodape && <div className="auth-rodape">{rodape}</div>}
    </main>
  )
}

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <main className="auth">
      <div className="auth-carregando" role="status">
        <span className="girando" aria-hidden="true" />
        {texto}
      </div>
    </main>
  )
}

export function Erro({ children }) {
  if (!children) return null
  // a key faz a animação de "balançar" repetir a cada erro novo
  return (
    <p className="auth-erro" role="alert" key={String(children)}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v6M12 16.500v.5" stroke="currentColor" strokeWidth="2.200" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </p>
  )
}

export function BotaoAuth({ ocupado, textoOcupado, children, ...props }) {
  return (
    <button type="submit" className="auth-botao" disabled={ocupado || props.disabled} {...props}>
      {ocupado && <span className="girando" aria-hidden="true" />}
      {ocupado ? textoOcupado : children}
    </button>
  )
}

// 6 caixinhas para o código do autenticador: avança sozinho, aceita colar
export function CodigoSeisDigitos({ valor, onChange, onCompleto, desabilitado, erro }) {
  const caixas = useRef([])
  const digitos = Array.from({ length: 6 }, (_, i) => valor[i] || '')

  useEffect(() => {
    caixas.current[Math.min(valor.length, 5)]?.focus()
    // foca na primeira caixa vazia ao abrir e depois de um erro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erro])

  function definir(novo) {
    const limpo = novo.replace(/\D/g, '').slice(0, 6)
    onChange(limpo)
    if (limpo.length === 6) onCompleto?.(limpo)
    return limpo
  }

  function aoDigitar(i, e) {
    let bruto = e.target.value.replace(/\D/g, '')
    if (!bruto) return
    // caixa já preenchida + um dígito novo: fica só o novo
    if (digitos[i] && bruto.length === 2) {
      bruto = bruto.startsWith(digitos[i]) ? bruto[1] : bruto[0]
    }
    if (bruto.length > 1) {
      // colou ou o teclado preencheu tudo de uma vez
      const limpo = definir(valor.slice(0, i) + bruto)
      caixas.current[Math.min(limpo.length, 5)]?.focus()
      return
    }
    const novo = valor.slice(0, i) + bruto + valor.slice(i + 1)
    definir(novo)
    caixas.current[i + 1]?.focus()
  }

  function aoTeclar(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digitos[i]) {
        onChange(valor.slice(0, i) + valor.slice(i + 1))
      } else if (i > 0) {
        onChange(valor.slice(0, i - 1) + valor.slice(i))
        caixas.current[i - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && i > 0) caixas.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < 5) caixas.current[i + 1]?.focus()
  }

  // não deixa pular caixas: o foco vai para a primeira vazia
  function aoFocar(i, e) {
    if (i > valor.length) caixas.current[valor.length]?.focus()
    else e.target.select()
  }

  function aoColar(e) {
    e.preventDefault()
    const limpo = definir(e.clipboardData.getData('text'))
    caixas.current[Math.min(limpo.length, 5)]?.focus()
  }

  return (
    <div className={`otp ${erro ? 'otp-erro' : ''}`} onPaste={aoColar}>
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => (caixas.current[i] = el)}
          className={`otp-caixa ${d ? 'cheia' : ''}`}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          value={d}
          disabled={desabilitado}
          aria-label={`Dígito ${i + 1} de 6`}
          onChange={(e) => aoDigitar(i, e)}
          onKeyDown={(e) => aoTeclar(i, e)}
          onFocus={(e) => aoFocar(i, e)}
        />
      ))}
    </div>
  )
}

// ícones simples
export const IconeCadeado = () => (
  <svg viewBox="0 0 24 24" width="26" height="26"><rect x="5" y="10.500" width="14" height="10" rx="2.500" fill="none" stroke="currentColor" strokeWidth="1.800" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" /><circle cx="12" cy="15.500" r="1.400" fill="currentColor" /></svg>
)
export const IconeEscudo = () => (
  <svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 3l7 3v5.500c0 4.400-3 8.100-7 9.500-4-1.400-7-5.100-7-9.500V6z" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinejoin="round" /><path d="M8.800 12.200l2.200 2.200 4.400-4.400" fill="none" stroke="currentColor" strokeWidth="1.900" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const IconeCelular = () => (
  <svg viewBox="0 0 24 24" width="26" height="26"><rect x="6.500" y="2.500" width="11" height="19" rx="2.500" fill="none" stroke="currentColor" strokeWidth="1.800" /><path d="M10.500 18.500h3" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" /></svg>
)
