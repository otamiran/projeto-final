// Carrega o jsPDF do CDN (só na primeira vez)
async function carregarJsPDF() {
  if (window.jspdf) return
  await new Promise((ok, erro) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = ok
    script.onerror = erro
    document.head.appendChild(script)
  })
}

// Converte URL de imagem para base64 (necessário para embutir no PDF)
async function urlParaBase64(url) {
  try {
    const resposta = await fetch(url)
    const blob = await resposta.blob()
    return new Promise((ok, erro) => {
      const leitor = new FileReader()
      leitor.onload = () => ok(leitor.result)
      leitor.onerror = erro
      leitor.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Busca validações e comentários do relatório no Supabase
async function buscarRetornoProducao(relatorioId) {
  try {
    const { bd, TABELA_VALIDACOES, TABELA_COMENTARIOS } = await import('./supabase')
    const [resV, resC] = await Promise.all([
      bd.from(TABELA_VALIDACOES).select('*').eq('relatorio_id', relatorioId),
      bd.from(TABELA_COMENTARIOS).select('*').eq('relatorio_id', relatorioId)
        .order('criado_em', { ascending: true }),
    ])
    return {
      validacoes:  resV.data || [],
      comentarios: resC.data || [],
    }
  } catch {
    return { validacoes: [], comentarios: [] }
  }
}

export async function gerarPDF(relatorio) {
  await carregarJsPDF()
  const { jsPDF } = window.jspdf

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const LARGURA = 210
  const MARGEM  = 14
  const UTIL    = LARGURA - MARGEM * 2
  let posY = MARGEM

  const dataFormatada = relatorio.data
    ? new Date(relatorio.data + 'T12:00').toLocaleDateString('pt-BR')
    : '—'

  const itens      = relatorio.itens || []
  const ocorrencias = itens.filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ')
  const atividades  = itens.filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ')

  // Busca retorno da produção (validações + comentários) se o relatório tiver ID
  const { validacoes, comentarios } = relatorio.id
    ? await buscarRetornoProducao(relatorio.id)
    : { validacoes: [], comentarios: [] }

  // Retorna a validação de um item pelo seu índice no array itens
  function validacaoDoItem(item) {
    const indice = itens.indexOf(item)
    return validacoes.find(v => v.item_indice === indice) || null
  }

  // Retorna os comentários de um item pelo seu índice
  function comentariosDoItem(item) {
    const indice = itens.indexOf(item)
    return comentarios.filter(c => c.item_indice === indice)
  }

  function hexRGB(hex) {
    hex = hex.replace('#', '')
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }

  function verificarEspaco(altura) {
    if (posY + altura > 284) {
      pdf.addPage()
      pdf.setFillColor(15, 17, 23)
      pdf.rect(0, 0, 210, 297, 'F')
      cabecalho()
    }
  }

  function cabecalho() {
    pdf.setFillColor(24, 28, 37)
    pdf.rect(0, 0, 210, 20, 'F')
    pdf.setFillColor(240, 165, 0)
    pdf.rect(0, 19, 210, 1.5, 'F')
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(240, 165, 0)
    pdf.text('PASSAGEM DE TURNO — MANUTENÇÃO', MARGEM, 11)
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(138, 149, 170)
    pdf.text(
      `${relatorio.setor || '—'}   |   ${dataFormatada}   |   Turno: ${relatorio.turno || '—'}`,
      MARGEM, 17
    )
    posY = 26
  }

  function tabelaResumo() {
    verificarEspaco(20)
    const colW = UTIL / 4
    pdf.setFillColor(24, 28, 37)
    pdf.roundedRect(MARGEM, posY, UTIL, 16, 1.5, 1.5, 'F')
    const celulas = [
      { rotulo: 'Técnico',      valor: relatorio.tecnico     || '—' },
      { rotulo: 'Responsável',  valor: relatorio.responsavel || '—' },
      { rotulo: 'Ocorrências',  valor: String(ocorrencias.length) },
      { rotulo: 'Atividades',   valor: String(atividades.length) },
    ]
    celulas.forEach((cel, i) => {
      const x = MARGEM + i * colW
      if (i > 0) {
        pdf.setDrawColor(42, 48, 64)
        pdf.line(x, posY + 2, x, posY + 14)
      }
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 110, 130)
      pdf.text(cel.rotulo, x + colW / 2, posY + 5.5, { align: 'center' })
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(212, 219, 232)
      pdf.text(cel.valor, x + colW / 2, posY + 12.5, { align: 'center' })
    })
    posY += 20
  }

  function tituloSecao(texto, cor) {
    verificarEspaco(10)
    pdf.setFillColor(...hexRGB(cor))
    pdf.roundedRect(MARGEM, posY, UTIL, 8.5, 1, 1, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    pdf.text(texto, MARGEM + 3.5, posY + 5.8)
    posY += 12
  }

  function linhaInfo(rotulo, valor) {
    const linhas = pdf.splitTextToSize(String(valor || '—'), UTIL - 42)
    const altura = linhas.length * 5.5 + 3
    verificarEspaco(altura)
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(100, 110, 130)
    pdf.text(rotulo + ':', MARGEM + 2, posY)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(200, 210, 225)
    pdf.text(linhas, MARGEM + 40, posY)
    posY += altura
  }

  // Desenha bloco de retorno da produção (validação + comentários)
  function desenharRetornoProducao(val, comentsDoItem) {
    if (!val && comentsDoItem.length === 0) return

    verificarEspaco(10)

    // Faixa de título "Retorno da Produção"
    pdf.setFillColor(40, 44, 58)
    pdf.roundedRect(MARGEM + 2, posY, UTIL - 4, 7, 1, 1, 'F')
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(160, 140, 200)
    pdf.text('RETORNO DA PRODUCAO', MARGEM + 5, posY + 5)
    posY += 10

    // Validação
    if (val) {
      const aprovado   = val.tipo === 'aprovado'
      const corVal     = aprovado ? [46, 204, 113] : [224, 80, 80]
      const textoVal   = aprovado ? '✅ APROVADO' : '❌ REPROVADO'
      const dataVal    = val.criado_em
        ? new Date(val.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : ''

      verificarEspaco(8)
      pdf.setFillColor(...corVal.map(v => Math.round(v * 0.15)))
      pdf.roundedRect(MARGEM + 2, posY, UTIL - 4, 7, 1, 1, 'F')
      pdf.setFontSize(8.5)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...corVal)
      pdf.text(textoVal, MARGEM + 5, posY + 5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(138, 149, 170)
      pdf.text(`por ${val.autor}${dataVal ? '  ·  ' + dataVal : ''}`, MARGEM + 38, posY + 5)
      posY += 10
    }

    // Comentários
    if (comentsDoItem.length > 0) {
      verificarEspaco(8)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(100, 110, 130)
      pdf.text('Comentários:', MARGEM + 5, posY)
      posY += 5

      for (const c of comentsDoItem) {
        // Cabeçalho do comentário: autor + data
        const dataC = c.criado_em
          ? new Date(c.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          : ''
        verificarEspaco(7)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(176, 127, 224) // roxo suave
        pdf.text(`${c.autor}${dataC ? '  ·  ' + dataC : ''}`, MARGEM + 5, posY)
        posY += 5

        // Texto do comentário (pode quebrar em múltiplas linhas)
        const linhasC = pdf.splitTextToSize(c.texto, UTIL - 12)
        const alturaC = linhasC.length * 5 + 3
        verificarEspaco(alturaC)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(200, 210, 225)
        pdf.text(linhasC, MARGEM + 5, posY)
        posY += alturaC
      }
    }

    posY += 3
  }

  async function desenharFotos(listaFotos) {
    if (!listaFotos?.length) return
    const larguraFoto = (UTIL - 6) / 2
    const alturaFoto  = larguraFoto * 0.68
    verificarEspaco(8)
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(100, 110, 130)
    pdf.text('Fotos:', MARGEM + 2, posY)
    posY += 5
    let coluna = 0
    for (let i = 0; i < listaFotos.length; i++) {
      if (coluna === 0) verificarEspaco(alturaFoto + 8)
      const x = MARGEM + coluna * (larguraFoto + 6)
      const base64 = await urlParaBase64(listaFotos[i].url)
      if (base64) {
        pdf.addImage(base64, 'JPEG', x, posY, larguraFoto, alturaFoto, undefined, 'FAST')
      } else {
        pdf.setFillColor(30, 35, 48)
        pdf.roundedRect(x, posY, larguraFoto, alturaFoto, 1, 1, 'F')
        pdf.setFontSize(7.5)
        pdf.setTextColor(80, 90, 110)
        pdf.text('Foto indisponível', x + larguraFoto / 2, posY + alturaFoto / 2, { align: 'center' })
      }
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 110, 130)
      pdf.text(`Foto ${i + 1}`, x + larguraFoto / 2, posY + alturaFoto + 4, { align: 'center' })
      coluna++
      if (coluna >= 2) { coluna = 0; posY += alturaFoto + 8 }
    }
    if (coluna > 0) posY += alturaFoto + 8
  }

  // ── MONTAGEM DO PDF ────────────────────────────────────────────────────────

  pdf.setFillColor(15, 17, 23)
  pdf.rect(0, 0, 210, 297, 'F')
  cabecalho()
  tabelaResumo()

  // ── Ocorrências ───────────────────────────────────────────────────────────
  if (ocorrencias.length > 0) {
    tituloSecao('OCORRÊNCIAS DO TURNO', '#e05c2a')

    for (let i = 0; i < ocorrencias.length; i++) {
      const o   = ocorrencias[i]
      const val = validacaoDoItem(o)
      const cms = comentariosDoItem(o)

      verificarEspaco(14)

      pdf.setFillColor(24, 28, 37)
      pdf.roundedRect(MARGEM, posY, UTIL, 10, 1, 1, 'F')
      pdf.setFillColor(224, 92, 42)
      pdf.rect(MARGEM, posY, 3.5, 10, 'F')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(212, 219, 232)
      const nomeExec = o.executor || o.autor || ''
      pdf.text(`Ocorrência ${i + 1}${nomeExec ? '  —  ' + nomeExec : ''}`, MARGEM + 6, posY + 7)
      posY += 13

      linhaInfo('Equipamento', o.equipamento || o.equip)
      linhaInfo('Sintoma',     o.sintoma)
      linhaInfo('Modo/Impacto',`${o.modo || '—'} / ${o.impacto || '—'}`)
      linhaInfo('Intervencao', o.intervencao || o.tipo_int)
      const inicio = o.horario_inicio || ''
      const fim    = o.horario_fim    || ''
      const dh = Number(o.duracao_h) || 0
      const dm = Number(o.duracao_m) || 0
      if (inicio || fim) linhaInfo('Horario', `${inicio || '—'} → ${fim || '—'}${(dh||dm) ? '  (' + [dh?dh+'h':'', dm?dm+'min':''].filter(Boolean).join(' ') + ')' : ''}`)
      linhaInfo('Solucao',     o.solucao)
      if (o.executor) linhaInfo('Executor',   o.executor)

      await desenharFotos(o.fotos)

      // Retorno da produção (validação + comentários) — após as fotos
      desenharRetornoProducao(val, cms)

      posY += 2
      pdf.setDrawColor(42, 48, 64)
      pdf.line(MARGEM, posY, MARGEM + UTIL, posY)
      posY += 6
    }
  }

  // ── Atividades ────────────────────────────────────────────────────────────
  if (atividades.length > 0) {
    posY += 2
    tituloSecao('ATIVIDADES PROGRAMADAS', '#4a90e2')

    const corStatus = {
      Concluída:       '#2ecc71',
      'Em andamento':  '#4a90e2',
      Pendente:        '#e05050',
    }

    for (let i = 0; i < atividades.length; i++) {
      const a   = atividades[i]
      const cor = corStatus[a.status] || '#5c6680'

      verificarEspaco(14)

      pdf.setFillColor(24, 28, 37)
      pdf.roundedRect(MARGEM, posY, UTIL, 10, 1, 1, 'F')
      pdf.setFillColor(...hexRGB(cor))
      pdf.rect(MARGEM, posY, 3.5, 10, 'F')
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(212, 219, 232)
      pdf.text(`Atividade ${i + 1}${a.autor ? '  —  ' + a.autor : ''}`, MARGEM + 6, posY + 7)
      if (a.status) {
        pdf.setFontSize(8.5)
        pdf.setTextColor(...hexRGB(cor))
        pdf.text(a.status, MARGEM + UTIL - 2, posY + 7, { align: 'right' })
      }
      posY += 13

      linhaInfo('Equipamento', a.equipamento || a.equip)
      linhaInfo('Descrição',   a.descricao   || a.desc)

      await desenharFotos(a.fotos)

      posY += 2
      pdf.setDrawColor(42, 48, 64)
      pdf.line(MARGEM, posY, MARGEM + UTIL, posY)
      posY += 6
    }
  }

  // ── Numeração de páginas ──────────────────────────────────────────────────
  const totalPaginas = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(70, 80, 100)
    pdf.text(
      `Página ${i} de ${totalPaginas}  |  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      LARGURA / 2, 292, { align: 'center' }
    )
  }

  pdf.save(
    `turno_${(relatorio.setor || 'relatorio').replace(/\s+/g, '_')}_${relatorio.data || 'sem_data'}.pdf`
  )
}
