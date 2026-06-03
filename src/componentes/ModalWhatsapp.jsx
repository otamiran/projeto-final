// Modal para digitar o número e escolher qual parte do relatório enviar

import { useState } from 'react'
import { textoOcorrencias, textoAtividades, textoCompleto } from '../utilitarios/textoRelatorio'

export default function ModalWhatsapp({ relatorio, aoFechar, mostrarAviso }) {
  const [numero, setNumero] = useState('') // número do destinatário
  const [tipo, setTipo] = useState('completo') // qual texto enviar

  // Se não tem relatório, não renderiza
  if (!relatorio) return null

  // Texto a enviar conforme a opção selecionada
  const texto =
    tipo === 'ocorrencias'
      ? textoOcorrencias(relatorio)
      : tipo === 'atividades'
        ? textoAtividades(relatorio)
        : textoCompleto(relatorio)

  function enviar() {
    // Remove tudo que não for número
    const numeroLimpo = numero.replace(/\D/g, '')
    if (!numeroLimpo || numeroLimpo.length < 10) {
      mostrarAviso('Informe um número válido.', true)
      return
    }
    // Abre o WhatsApp com o número e o texto já preenchidos
    window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(texto)}`, '_blank')
    aoFechar()
    mostrarAviso('WhatsApp aberto!')
  }

  return (
    <div className="fundo-modal" onClick={e => e.target === e.currentTarget && aoFechar()}>
      <div className="modal modal-whatsapp">
        {/* Cabeçalho verde do WhatsApp */}
        <div className="modal-cabecalho cabecalho-whatsapp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <h2>Enviar via WhatsApp</h2>
          <button className="botao-fechar-modal" onClick={aoFechar}>
            ✕
          </button>
        </div>

        <div className="modal-corpo">
          {/* Campo do número */}
          <div className="campo">
            <label>Número do destinatário</label>
            <input
              type="tel"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              placeholder="Ex: 5583999998888"
              style={{ fontFamily: 'var(--fonte-mono)' }}
            />
            <small>Formato: 55 + DDD + número (só dígitos)</small>
          </div>

          {/* Seleção do tipo de mensagem */}
          <div className="campo">
            <label>O que enviar</label>
            <div className="grupo-botoes">
              {[
                ['completo', '📋 Completo'],
                ['ocorrencias', '🔧 Ocorrências'],
                ['atividades', '📅 Atividades'],
              ].map(([v, r]) => (
                <button
                  key={v}
                  type="button"
                  className={`botao-alternancia ${tipo === v ? 'selecionado' : ''}`}
                  onClick={() => setTipo(v)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Preview do texto */}
          <div className="caixa-texto" style={{ maxHeight: 180 }}>
            {texto}
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="botao"
              onClick={aoFechar}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Cancelar
            </button>
            <button
              className="botao botao-whatsapp"
              onClick={enviar}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
