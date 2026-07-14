// Formulário de campos para uma ocorrência (falha de equipamento)

import BotoesAlternancia from './BotoesAlternancia'
import BotaoAudio from './BotaoAudio'
import { MODOS_FALHA, IMPACTOS, TIPOS_INTERVENCAO } from '../utilitarios/constantes'

export default function FormOcorrencia({ formulario, aoMudar, equipamentos = [] }) {
  // Atalho para atualizar um campo específico do formulário
  function campo(chave) {
    return valor => aoMudar(f => ({ ...f, [chave]: valor }))
  }

  return (
    <>
      {/* Equipamento — com autocomplete a partir da lista cadastrada em Admin */}
      <div className="campo">
        <label>Equipamento</label>
        <input
          type="text"
          list="lista-equipamentos-ocorrencia"
          placeholder="Ex: MR6034 — Redutor rosca sem-fim linha 3..."
          value={formulario.equipamento}
          onChange={e => aoMudar(f => ({ ...f, equipamento: e.target.value }))}
        />
        <datalist id="lista-equipamentos-ocorrencia">
          {equipamentos.map(eq => (
            <option key={eq.id} value={eq.tag ? `${eq.tag} — ${eq.nome}` : eq.nome} />
          ))}
        </datalist>
      </div>

      <div className="divisor" />

      {/* Sintoma — descrição da ocorrência, pode ser digitada ou ditada por voz */}
      <div className="campo">
        <label>Sintoma observado</label>
        <textarea
          rows={2}
          placeholder="O que foi observado..."
          value={formulario.sintoma}
          onChange={e => aoMudar(f => ({ ...f, sintoma: e.target.value }))}
        />
        <BotaoAudio
          valorAtual={formulario.sintoma}
          aoReconhecer={texto => aoMudar(f => ({ ...f, sintoma: texto }))}
        />
      </div>

      {/* Modo de falha */}
      <div className="campo">
        <label>Modo de falha</label>
        <BotoesAlternancia opcoes={MODOS_FALHA} valor={formulario.modo} aoMudar={campo('modo')} />
      </div>

      {/* Impacto */}
      <div className="campo">
        <label>Impacto operacional</label>
        <BotoesAlternancia
          opcoes={IMPACTOS}
          valor={formulario.impacto}
          aoMudar={campo('impacto')}
        />
      </div>

      <div className="divisor" />

      {/* Tipo de intervenção */}
      <div className="campo">
        <label>Tipo de intervenção</label>
        <BotoesAlternancia
          opcoes={TIPOS_INTERVENCAO}
          valor={formulario.intervencao}
          aoMudar={campo('intervencao')}
        />
      </div>

      {/* Horário de início e fim com cálculo automático de duração */}
      <div className="campo">
        <label>Horário início / fim</label>
        <div className="duracao-campos" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap', maxWidth: 'none' }}>
          <div className="duracao-grupo" style={{ flex: 1 }}>
            <input
              type="time"
              value={formulario.horario_inicio ?? ''}
              onChange={e => {
                const inicio = e.target.value
                aoMudar(f => {
                  const fim = f.horario_fim || ''
                  let dh = '', dm = ''
                  if (inicio && fim) {
                    const [hi, mi] = inicio.split(':').map(Number)
                    const [hf, mf] = fim.split(':').map(Number)
                    let total = (hf * 60 + mf) - (hi * 60 + mi)
                    if (total < 0) total += 24 * 60
                    dh = Math.floor(total / 60)
                    dm = total % 60
                  }
                  return { ...f, horario_inicio: inicio, duracao_h: dh, duracao_m: dm }
                })
              }}
              style={{ padding: '6px 8px' }}
            />
            <span className="duracao-label">início</span>
            <button
              type="button"
              className="botao botao-pequeno"
              title="Preencher com o horário atual"
              onClick={() => {
                const agora = new Date()
                const inicio = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
                aoMudar(f => {
                  const fim = f.horario_fim || ''
                  let dh = '', dm = ''
                  if (inicio && fim) {
                    const [hi, mi] = inicio.split(':').map(Number)
                    const [hf, mf] = fim.split(':').map(Number)
                    let total = (hf * 60 + mf) - (hi * 60 + mi)
                    if (total < 0) total += 24 * 60
                    dh = Math.floor(total / 60)
                    dm = total % 60
                  }
                  return { ...f, horario_inicio: inicio, duracao_h: dh, duracao_m: dm }
                })
              }}
            >
              🕐 Agora
            </button>
          </div>
          <span style={{ color: 'var(--cor-apagado)' }}>→</span>
          <div className="duracao-grupo" style={{ flex: 1 }}>
            <input
              type="time"
              value={formulario.horario_fim ?? ''}
              onChange={e => {
                const fim = e.target.value
                aoMudar(f => {
                  const inicio = f.horario_inicio || ''
                  let dh = '', dm = ''
                  if (inicio && fim) {
                    const [hi, mi] = inicio.split(':').map(Number)
                    const [hf, mf] = fim.split(':').map(Number)
                    let total = (hf * 60 + mf) - (hi * 60 + mi)
                    if (total < 0) total += 24 * 60
                    dh = Math.floor(total / 60)
                    dm = total % 60
                  }
                  return { ...f, horario_fim: fim, duracao_h: dh, duracao_m: dm }
                })
              }}
              style={{ padding: '6px 8px' }}
            />
            <span className="duracao-label">fim</span>
            <button
              type="button"
              className="botao botao-pequeno"
              title="Preencher com o horário atual"
              onClick={() => {
                const agora = new Date()
                const fim = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
                aoMudar(f => {
                  const inicio = f.horario_inicio || ''
                  let dh = '', dm = ''
                  if (inicio && fim) {
                    const [hi, mi] = inicio.split(':').map(Number)
                    const [hf, mf] = fim.split(':').map(Number)
                    let total = (hf * 60 + mf) - (hi * 60 + mi)
                    if (total < 0) total += 24 * 60
                    dh = Math.floor(total / 60)
                    dm = total % 60
                  }
                  return { ...f, horario_fim: fim, duracao_h: dh, duracao_m: dm }
                })
              }}
            >
              🕐 Agora
            </button>
          </div>
          {/* Exibe tempo total calculado */}
          {(formulario.duracao_h !== '' || formulario.duracao_m !== '') && (
            <div style={{
              background: 'var(--cor-fundo-3)',
              border: '1px solid var(--cor-borda)',
              borderRadius: 'var(--raio)',
              color: 'var(--ambar)',
              fontFamily: 'var(--fonte-mono)',
              fontSize: 12,
              padding: '4px 10px',
              whiteSpace: 'nowrap',
            }}>
              ⏱ {formulario.duracao_h ? formulario.duracao_h + 'h' : ''}{formulario.duracao_m ? ' ' + formulario.duracao_m + 'min' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Solução */}
      <div className="campo">
        <label>Descrição da solução</label>
        <textarea
          rows={2}
          placeholder="Como foi resolvido..."
          value={formulario.solucao}
          onChange={e => aoMudar(f => ({ ...f, solucao: e.target.value }))}
        />
        <BotaoAudio
          valorAtual={formulario.solucao}
          aoReconhecer={texto => aoMudar(f => ({ ...f, solucao: texto }))}
        />
      </div>

      <div className="divisor" />

      {/* Executor — pode ser alterado após o preenchimento para o PDF */}
      <div className="campo">
        <label>
          Executor da atividade
          <span style={{ color: 'var(--cor-apagado)', fontWeight: 'normal', fontSize: 11, marginLeft: 6 }}>
            (editável para o PDF)
          </span>
        </label>
        <input
          type="text"
          placeholder="Nome de quem executou..."
          value={formulario.executor ?? ''}
          onChange={e => aoMudar(f => ({ ...f, executor: e.target.value }))}
        />
      </div>
    </>
  )
}
