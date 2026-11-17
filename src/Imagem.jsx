import { useState } from 'react'

// imagem que aparece suavemente quando termina de carregar
export default function Imagem({ className = '', ...props }) {
  const [ok, setOk] = useState(false)
  return (
    <img
      {...props}
      className={`${className} img-fade ${ok ? 'carregada' : ''}`}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth > 0) setOk(true)
      }}
      onLoad={() => setOk(true)}
    />
  )
}
