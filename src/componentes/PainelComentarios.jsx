// Painel de comentários de uma ocorrência
// Usado na tela de produção para enviar e ver comentários

import { useState } from 'react'

export default function PainelComentarios({ comentarios, aoEnviar }) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!texto.trim()) return
    setEnviando(true)
    await aoEnviar(texto)
    setTexto('')
    setEnviando(false)
  }

  function formatarHora(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="painel-comentarios">
      {/* Lista de comentários existentes */}
      {comentarios.length === 0 ? (
        <p className="sem-comentarios">Nenhum comentário ainda.</p>
      ) : (
        <div className="lista-comentarios">
          {comentarios.map(c => (
            <div key={c.id} className="comentario">
              <div className="comentario-header">
                <strong>{c.autor}</strong>
                <span className="comentario-hora">{formatarHora(c.criado_em)}</span>
              </div>
              <p className="comentario-texto">{c.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campo para novo comentário */}
      <div className="novo-comentario">
        <textarea
          className="input-comentario"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escreva um comentário para a manutenção..."
          rows={2}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), enviar())}
        />
        <button
          className="botao botao-destaque"
          onClick={enviar}
          disabled={enviando || !texto.trim()}
        >
          {enviando ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
