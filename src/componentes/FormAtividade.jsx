// Formulário de campos para uma atividade programada

import BotoesAlternancia from './BotoesAlternancia'
import BotaoAudio from './BotaoAudio'
import { STATUS_ATIVIDADE, COR_STATUS } from '../utilitarios/constantes'

export default function FormAtividade({ formulario, aoMudar, equipamentos = [] }) {
  return (
    <>
      {/* Equipamento — com autocomplete a partir da lista cadastrada em Admin */}
      <div className="campo">
        <label>Equipamento</label>
        <input
          type="text"
          list="lista-equipamentos-atividade"
          placeholder="Ex: MR6034 — Motor da esteira 2..."
          value={formulario.equipamento}
          onChange={e => aoMudar(f => ({ ...f, equipamento: e.target.value }))}
        />
        <datalist id="lista-equipamentos-atividade">
          {equipamentos.map(eq => (
            <option key={eq.id} value={eq.tag ? `${eq.tag} — ${eq.nome}` : eq.nome} />
          ))}
        </datalist>
      </div>

      {/* Descrição da atividade — pode ser digitada ou ditada por voz */}
      <div className="campo">
        <label>Descrição da atividade</label>
        <textarea
          rows={2}
          placeholder="Descreva o que foi feito ou precisa ser feito..."
          value={formulario.descricao}
          onChange={e => aoMudar(f => ({ ...f, descricao: e.target.value }))}
        />
        <BotaoAudio
          valorAtual={formulario.descricao}
          aoReconhecer={texto => aoMudar(f => ({ ...f, descricao: texto }))}
        />
      </div>

      <div className="divisor" />

      {/* Status */}
      <div className="campo">
        <label>Status</label>
        {/* getClasse retorna a cor correta para cada status (verde/azul/vermelho) */}
        <BotoesAlternancia
          opcoes={STATUS_ATIVIDADE}
          valor={formulario.status}
          aoMudar={s => aoMudar(f => ({ ...f, status: s }))}
          getClasse={opcao => COR_STATUS[opcao] || ''}
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
