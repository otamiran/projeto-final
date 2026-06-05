// Exibe um FCA completo no formato estruturado
// Usado na tela de manutenção e de produção

// Gera o texto formatado para envio pelo WhatsApp
function gerarTextoFCA(fca) {
  const linhas = []
  linhas.push(`🔧 *FCA – ${fca.equipamento}*`)
  linhas.push(`_por ${fca.criado_por}_`)
  linhas.push('')

  if (fca.fato) {
    linhas.push('📌 *1. FATO OBSERVADO*')
    linhas.push(fca.fato)
    linhas.push('')
  }
  if (fca.causas?.length) {
    linhas.push('⚠️ *2. POSSÍVEIS CAUSAS*')
    fca.causas.forEach(i => linhas.push(`• ${i}`))
    linhas.push('')
  }
  if (fca.acoes_verificacao?.length) {
    linhas.push('🔎 *3. AÇÕES DE VERIFICAÇÃO*')
    fca.acoes_verificacao.forEach(i => linhas.push(`• ${i}`))
    linhas.push('')
  }
  if (fca.acao_corretiva?.length) {
    linhas.push('🛠️ *4. AÇÃO CORRETIVA*')
    fca.acao_corretiva.forEach(i => linhas.push(`• ${i}`))
    linhas.push('')
  }
  if (fca.acoes_futuras?.length) {
    linhas.push('📅 *5. AÇÕES FUTURAS / PREVENTIVAS*')
    fca.acoes_futuras.forEach(i => linhas.push(`• ${i}`))
    linhas.push('')
  }
  if (fca.resultado) {
    linhas.push('✅ *6. RESULTADO*')
    linhas.push(fca.resultado)
    linhas.push('')
  }
  if (fca.validacao_tipo) {
    const val = fca.validacao_tipo === 'aprovado' ? '✅ APROVADO' : '❌ REPROVADO'
    linhas.push(`🏭 *Validação Produção:* ${val} por ${fca.validacao_autor}`)
  }
  return linhas.join('\n')
}

// Badge de validação (aprovado / reprovado)
function BadgeValidacao({ tipo, autor, em }) {
  if (!tipo) return null
  const aprovado = tipo === 'aprovado'
  const data = em
    ? new Date(em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div className={`fca-badge-validacao ${aprovado ? 'fca-aprovado' : 'fca-reprovado'}`}>
      {aprovado ? '✅ Aprovado' : '❌ Reprovado'} por <strong>{autor}</strong>
      {data && <span className="fca-val-data"> · {data}</span>}
    </div>
  )
}

// Seção com lista de tópicos
function SecaoLista({ icone, titulo, itens }) {
  if (!itens || itens.length === 0) return null
  return (
    <div className="fca-secao">
      <div className="fca-secao-header"><span>{icone}</span><span>{titulo}</span></div>
      <ul className="fca-lista">
        {itens.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

// Seção com texto simples
function SecaoTexto({ icone, titulo, texto }) {
  if (!texto) return null
  return (
    <div className="fca-secao">
      <div className="fca-secao-header"><span>{icone}</span><span>{titulo}</span></div>
      <p className="fca-texto">{texto}</p>
    </div>
  )
}

export default function CardFCA({ fca, podeEditar, podeValidar, aoEditar, aoExcluir, aoValidar, autor }) {
  const data = fca.criado_em
    ? new Date(fca.criado_em).toLocaleDateString('pt-BR')
    : '—'

  function enviarWhatsApp() {
    const texto = gerarTextoFCA(fca)
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank')
  }

  return (
    <div className="card card-fca">

      {/* Cabeçalho */}
      <div className="fca-header">
        <div>
          <div className="fca-equipamento">🔧 FCA – {fca.equipamento}</div>
          <div className="fca-meta">por {fca.criado_por} · {data}</div>
        </div>
        <BadgeValidacao tipo={fca.validacao_tipo} autor={fca.validacao_autor} em={fca.validacao_em} />
      </div>

      {/* Corpo */}
      <div className="fca-corpo">
        <SecaoTexto icone="📌" titulo="1. FATO OBSERVADO"              texto={fca.fato} />
        <SecaoLista icone="⚠️" titulo="2. POSSÍVEIS CAUSAS"            itens={fca.causas} />
        <SecaoLista icone="🔎" titulo="3. AÇÕES DE VERIFICAÇÃO"        itens={fca.acoes_verificacao} />
        <SecaoLista icone="🛠️" titulo="4. AÇÃO CORRETIVA"              itens={fca.acao_corretiva} />
        <SecaoLista icone="📅" titulo="5. AÇÕES FUTURAS / PREVENTIVAS" itens={fca.acoes_futuras} />
        <SecaoTexto icone="✅" titulo="6. RESULTADO"                   texto={fca.resultado} />
      </div>

      {/* Ações */}
      <div className="fca-rodape">
        {/* Manutenção: editar e excluir */}
        {podeEditar && (
          <>
            <button className="botao botao-azul botao-pequeno" onClick={() => aoEditar(fca)}>✏ Editar</button>
            <button className="botao botao-vermelho botao-pequeno" onClick={() => aoExcluir(fca.id)}>🗑 Excluir</button>
          </>
        )}

        {/* WhatsApp — disponível para todos */}
        <button className="botao botao-whatsapp botao-pequeno" onClick={enviarWhatsApp}>
          📲 WhatsApp
        </button>

        {/* Produção: aprovar e reprovar */}
        {podeValidar && (
          <>
            <button
              className={`botao-validar ${fca.validacao_tipo === 'aprovado' ? 'ativo-verde' : ''}`}
              onClick={() => aoValidar(fca.id, 'aprovado', autor)}
            >✅ Aprovar</button>
            <button
              className={`botao-validar ${fca.validacao_tipo === 'reprovado' ? 'ativo-vermelho' : ''}`}
              onClick={() => aoValidar(fca.id, 'reprovado', autor)}
            >❌ Reprovar</button>
          </>
        )}
      </div>
    </div>
  )
}
