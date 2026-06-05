// Formulario de criacao/edicao de FCA
// Cada secao tem uma lista dinamica de topicos

import { useState } from 'react'

// Lista de topicos com adicionar/remover/editar cada item
function ListaTopicos({ rotulo, icone, itens, aoMudar }) {
  const [novo, setNovo] = useState('')

  function adicionar() {
    const texto = novo.trim()
    if (!texto) return
    aoMudar([...itens, texto])
    setNovo('')
  }

  function remover(idx) { aoMudar(itens.filter((_, i) => i !== idx)) }

  function editar(idx, valor) {
    const copia = [...itens]
    copia[idx] = valor
    aoMudar(copia)
  }

  return (
    <div className="fca-secao-form">
      <div className="fca-secao-titulo">{icone} {rotulo}</div>

      {itens.map((item, idx) => (
        <div key={idx} className="fca-item-row">
          <span className="fca-bullet">•</span>
          <input className="fca-input-item" value={item} onChange={e => editar(idx, e.target.value)} />
          <button className="fca-btn-remover" onClick={() => remover(idx)}>✕</button>
        </div>
      ))}

      <div className="fca-item-row">
        <span className="fca-bullet" style={{ opacity: 0.3 }}>+</span>
        <input
          className="fca-input-item fca-input-novo"
          placeholder={`Adicionar item...`}
          value={novo}
          onChange={e => setNovo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionar())}
        />
        <button className="fca-btn-adicionar" onClick={adicionar}>+</button>
      </div>
    </div>
  )
}

const VAZIO = {
  equipamento: '', fato: '',
  causas: [], acoes_verificacao: [], acao_corretiva: [], acoes_futuras: [],
  resultado: '',
}

export default function FormFCA({ inicial, aoSalvar, aoFechar, salvando }) {
  const [form, setForm] = useState(inicial ? { ...VAZIO, ...inicial } : VAZIO)

  const ev    = k => e  => setForm(f => ({ ...f, [k]: e.target.value }))
  const lista = k => v  => setForm(f => ({ ...f, [k]: v }))

  function handleSalvar() {
    if (!form.equipamento.trim()) { alert('Informe o equipamento.'); return }
    if (!form.fato.trim())        { alert('Informe o fato observado.'); return }
    aoSalvar(form)
  }

  return (
    <div className="form-fca">

      {/* Equipamento */}
      <div className="fca-secao-form">
        <div className="fca-secao-titulo">🔧 EQUIPAMENTO</div>
        <input className="fca-input-texto" placeholder="Ex: Prensa Compacta 07"
          value={form.equipamento} onChange={ev('equipamento')} />
      </div>

      {/* 1. Fato */}
      <div className="fca-secao-form">
        <div className="fca-secao-titulo">📌 1. FATO OBSERVADO</div>
        <textarea className="fca-textarea" rows={3}
          placeholder="Descreva o que foi observado..."
          value={form.fato} onChange={ev('fato')} />
      </div>

      {/* 2 a 5 — listas */}
      <ListaTopicos rotulo="2. POSSÍVEIS CAUSAS"            icone="⚠️" itens={form.causas}            aoMudar={lista('causas')} />
      <ListaTopicos rotulo="3. AÇÕES DE VERIFICAÇÃO"        icone="🔎" itens={form.acoes_verificacao} aoMudar={lista('acoes_verificacao')} />
      <ListaTopicos rotulo="4. AÇÃO CORRETIVA"              icone="🛠️" itens={form.acao_corretiva}    aoMudar={lista('acao_corretiva')} />
      <ListaTopicos rotulo="5. AÇÕES FUTURAS / PREVENTIVAS" icone="📅" itens={form.acoes_futuras}     aoMudar={lista('acoes_futuras')} />

      {/* 6. Resultado */}
      <div className="fca-secao-form">
        <div className="fca-secao-titulo">✅ 6. RESULTADO</div>
        <textarea className="fca-textarea" rows={3}
          placeholder="Descreva o resultado após as intervenções..."
          value={form.resultado} onChange={ev('resultado')} />
      </div>

      <div className="fca-form-botoes">
        <button className="botao botao-destaque" onClick={handleSalvar} disabled={salvando}>
          {salvando ? 'Salvando...' : '💾 Salvar FCA'}
        </button>
        <button className="botao" onClick={aoFechar}>Cancelar</button>
      </div>
    </div>
  )
}
