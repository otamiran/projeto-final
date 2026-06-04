// Formulário de campos para uma ocorrência (falha de equipamento)

import BotoesAlternancia from './BotoesAlternancia'
import { MODOS_FALHA, IMPACTOS, TIPOS_INTERVENCAO } from '../utilitarios/constantes'

export default function FormOcorrencia({ formulario, aoMudar }) {
  // Atalho para atualizar um campo específico do formulário
  function campo(chave) {
    return valor => aoMudar(f => ({ ...f, [chave]: valor }))
  }

  return (
    <>
      {/* Equipamento */}
      <div className="campo">
        <label>Equipamento</label>
        <textarea
          rows={2}
          placeholder="Ex: Bomba centrífuga linha 3..."
          value={formulario.equipamento}
          onChange={e => aoMudar(f => ({ ...f, equipamento: e.target.value }))}
        />
      </div>

      <div className="divisor" />

      {/* Sintoma */}
      <div className="campo">
        <label>Sintoma observado</label>
        <textarea
          rows={2}
          placeholder="O que foi observado..."
          value={formulario.sintoma}
          onChange={e => aoMudar(f => ({ ...f, sintoma: e.target.value }))}
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

      {/* Duração da intervenção */}
      <div className="campo">
        <label>Duração da intervenção</label>
        <div className="duracao-campos">
          {/* Horas */}
          <div className="duracao-grupo">
            <input
              type="number"
              min="0"
              max="23"
              placeholder="0"
              value={formulario.duracao_h ?? ''}
              onChange={e => aoMudar(f => ({ ...f, duracao_h: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="input-duracao"
            />
            <span className="duracao-label">h</span>
          </div>
          {/* Minutos */}
          <div className="duracao-grupo">
            <input
              type="number"
              min="0"
              max="59"
              placeholder="0"
              value={formulario.duracao_m ?? ''}
              onChange={e => aoMudar(f => ({ ...f, duracao_m: e.target.value === '' ? '' : Number(e.target.value) }))}
              className="input-duracao"
            />
            <span className="duracao-label">min</span>
          </div>
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
      </div>
    </>
  )
}
