// Tela de compartilhamento (WhatsApp) do relatório de manutenção em
// andamento. Antes vivia como a aba "🔧 Manutenção" dentro do modal de
// relatório da Ronda (ver src/ronda/componentes/RelatorioModal.jsx); agora
// mora aqui, na própria aba "Manutenção" (PaginaManutencao.jsx), já que é
// sobre atendimentos de manutenção — a Ronda mantém só a tela de
// compartilhamento do relatório de ronda.
//
// Reaproveita o mesmo gerador de texto usado antes (gerarTextoManutencao),
// só muda onde a tela é exibida.

import { useState, useMemo, useEffect } from 'react'
import { gerarTextoManutencao } from '../ronda/constantes.js'

export default function ModalCompartilharManutencao({
  maquinas = [], atendimentos = [], setores = [], grupos = [], aoFechar, mostrarAviso,
}) {
  const [copiado, setCopiado] = useState(false)

  const maquinasComManutencao = useMemo(
    () => maquinas.filter(m => atendimentos.some(a => a.maquina_id === m.id)),
    [maquinas, atendimentos]
  )
  const [maquinasSel, setMaquinasSel] = useState(() => new Set(maquinasComManutencao.map(m => m.id)))

  // ao abrir/atualizar a lista, seleciona por padrão todas as máquinas em manutenção
  useEffect(() => {
    setMaquinasSel(new Set(maquinasComManutencao.map(m => m.id)))
  }, [maquinasComManutencao])

  const toggleMaquina = id => {
    setMaquinasSel(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodas = () => {
    setMaquinasSel(prev =>
      prev.size === maquinasComManutencao.length ? new Set() : new Set(maquinasComManutencao.map(m => m.id))
    )
  }

  const texto = useMemo(() => {
    const maquinasSelecionadas = maquinasComManutencao.filter(m => maquinasSel.has(m.id))
    return gerarTextoManutencao({
      maquinas: maquinasSelecionadas, atendimentos, setores, grupos, agora: new Date(),
    })
  }, [maquinasComManutencao, maquinasSel, atendimentos, setores, grupos])

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = texto; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
    mostrarAviso?.('✓ Texto copiado!')
  }

  return (
    <div className="fundo-modal" onClick={e => e.target === e.currentTarget && aoFechar()}>
      <div className="modal modal-whatsapp">
        <div className="modal-cabecalho cabecalho-whatsapp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <h2>Compartilhar relatório de manutenção</h2>
          <button className="botao-fechar-modal" onClick={aoFechar}>✕</button>
        </div>

        <div className="modal-corpo">
          <div className="campo">
            <label>Máquinas em manutenção (em andamento ou pendente)</label>
            {maquinasComManutencao.length > 0 && (
              <button
                type="button"
                className="botao botao-pequeno"
                style={{ alignSelf: 'flex-start' }}
                onClick={toggleTodas}
              >
                {maquinasSel.size === maquinasComManutencao.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            )}
          </div>

          {maquinasComManutencao.length === 0 ? (
            <p className="texto-apagado" style={{ textAlign: 'center', padding: '12px 0' }}>
              Nenhum atendimento em andamento ou pendente no momento.
            </p>
          ) : (
            <div className="grupo-botoes">
              {maquinasComManutencao.map(m => {
                const detalhe = atendimentos
                  .filter(a => a.maquina_id === m.id)
                  .map(a => {
                    if (!a.manutentor_id) return '🕓 pendente'
                    return a.estacao_nome ? `${a.manutentor_nome} (${a.estacao_nome})` : a.manutentor_nome
                  })
                  .join(', ')
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`botao-alternancia ${maquinasSel.has(m.id) ? 'selecionado' : ''}`}
                    onClick={() => toggleMaquina(m.id)}
                    title={detalhe}
                  >
                    🔧 {m.nome}
                  </button>
                )
              })}
            </div>
          )}

          {/* Preview do texto */}
          <div className="caixa-texto" style={{ maxHeight: 220 }}>{texto}</div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="botao" onClick={aoFechar} style={{ flex: 1, justifyContent: 'center' }}>
              Fechar
            </button>
            <button className="botao" onClick={copiar} style={{ flex: 1, justifyContent: 'center' }}>
              {copiado ? '✓ Copiado!' : 'Copiar texto'}
            </button>
            <a
              className="botao botao-whatsapp"
              style={{ flex: 2, justifyContent: 'center' }}
              href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
