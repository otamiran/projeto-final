// Card colapsável — usado na tela Admin para reduzir a rolagem inicial.
// Fica fechado por padrão e expande ao clicar no cabeçalho.

import { useState } from 'react'

export default function SecaoColapsavel({ titulo, badge, defaultAberto = false, children }) {
  const [aberto, setAberto] = useState(defaultAberto)

  return (
    <div className="card">
      <div
        className="card-cabecalho"
        onClick={() => setAberto(a => !a)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span className="card-rotulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.15s',
              transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
              fontSize: 11,
              color: 'var(--cor-apagado)',
            }}
          >
            ▶
          </span>
          {titulo}
        </span>
        {badge}
      </div>
      {aberto && <div className="card-corpo">{children}</div>}
    </div>
  )
}
