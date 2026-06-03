// Formulário de campos para uma atividade programada

import BotoesAlternancia from './BotoesAlternancia'
import { STATUS_ATIVIDADE, COR_STATUS } from '../utilitarios/constantes'

export default function FormAtividade({ formulario, aoMudar }) {
  return (
    <>
      {/* Equipamento */}
      <div className="campo">
        <label>Equipamento</label>
        <textarea
          rows={2}
          placeholder="Ex: Motor da esteira 2..."
          value={formulario.equipamento}
          onChange={e => aoMudar(f => ({ ...f, equipamento: e.target.value }))}
        />
      </div>

      {/* Descrição da atividade */}
      <div className="campo">
        <label>Descrição da atividade</label>
        <textarea
          rows={2}
          placeholder="Descreva o que foi feito ou precisa ser feito..."
          value={formulario.descricao}
          onChange={e => aoMudar(f => ({ ...f, descricao: e.target.value }))}
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
    </>
  )
}
