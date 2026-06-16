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

// Converte URL de imagem para base64
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
    return { validacoes: resV.data || [], comentarios: resC.data || [] }
  } catch {
    return { validacoes: [], comentarios: [] }
  }
}

export async function gerarPDF(relatorio) {
  await carregarJsPDF()
  const { jsPDF } = window.jspdf

  let logoBase64 = null
  try { logoBase64 = await urlParaBase64('/favicon.icon.png') } catch { }

  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const LARGURA = 210
  const MARGEM  = 14
  const UTIL    = LARGURA - MARGEM * 2
  let posY = MARGEM

  const dataFormatada = relatorio.data
    ? new Date(relatorio.data + 'T12:00').toLocaleDateString('pt-BR')
    : '—'

  const itens       = relatorio.itens || []
  const ocorrencias = itens.filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ')
  const atividades  = itens.filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ')

  const { validacoes, comentarios } = relatorio.id
    ? await buscarRetornoProducao(relatorio.id)
    : { validacoes: [], comentarios: [] }

  function validacaoDoItem(item) {
    return validacoes.find(v => v.item_indice === itens.indexOf(item)) || null
  }
  function comentariosDoItem(item) {
    return comentarios.filter(c => c.item_indice === itens.indexOf(item))
  }

  function hexRGB(hex) {
    hex = hex.replace('#', '')
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)]
  }

  // Contexto da seção atual — atualizado sempre que uma nova seção é iniciada
  // Permite que páginas de continuação repitam o cabeçalho da seção
  let _secaoAtual = { textoBase: null, nomeTecnico: null, cor: null }

  function definirSecaoAtual(textoBase, nomeTecnico, cor) {
    _secaoAtual = { textoBase, nomeTecnico, cor }
  }

  // Fundo escuro de página (sem cabeçalho)
  function fundoNovaPagina() {
    pdf.setFillColor(15, 17, 23)
    pdf.rect(0, 0, 210, 297, 'F')
    // Linha âmbar fina no topo como referência visual
    pdf.setFillColor(240, 165, 0)
    pdf.rect(0, 0, 210, 1.5, 'F')
    posY = 10
  }

  // Verifica espaço — se precisar de nova página, repete o cabeçalho da seção atual
  function verificarEspaco(altura) {
    if (posY + altura > 284) {
      pdf.addPage()
      fundoNovaPagina()
      // Repete o título da seção na página de continuação (com indicação "(cont.)")
      if (_secaoAtual.textoBase && _secaoAtual.cor) {
        const { textoBase, nomeTecnico, cor } = _secaoAtual
        pdf.setFillColor(...hexRGB(cor))
        pdf.roundedRect(MARGEM, posY, UTIL, 8.5, 1, 1, 'F')
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(255, 255, 255)
        const textoCont = nomeTecnico
          ? `${textoBase}  —  ${nomeTecnico.toUpperCase()}  (cont.)`
          : `${textoBase}  (cont.)`
        pdf.text(textoCont, MARGEM + 3.5, posY + 5.8)
        posY += 12
      }
    }
  }

  // Cabeçalho completo: logo + título — APENAS primeira página
  function cabecalho() {
    pdf.setFillColor(15, 17, 23)
    pdf.rect(0, 0, 210, 297, 'F')
    pdf.setFillColor(24, 28, 37)
    pdf.rect(0, 0, 210, 26, 'F')
    pdf.setFillColor(240, 165, 0)
    pdf.rect(0, 25, 210, 1.5, 'F')

    const logoSize = 16
    if (logoBase64) {
      pdf.addImage(logoBase64, 'PNG', MARGEM, 5, logoSize, logoSize)
    }
    const textoX = logoBase64 ? MARGEM + logoSize + 4 : MARGEM
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(240, 165, 0)
    pdf.text((relatorio.titulo || 'PASSAGEM DE TURNO').toUpperCase() + ' — MANUTENÇÃO', textoX, 13)
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(138, 149, 170)
    pdf.text(
      `${relatorio.setor || '—'}   |   ${dataFormatada}   |   Turno: ${relatorio.turno || '—'}`,
      textoX, 21
    )
    posY = 32
  }

  // Recebe opcionalmente os dados do técnico atual para exibir por bloco
  function tabelaResumo(nomeTecnico, qtdOcs, qtdAtivs) {
    verificarEspaco(20)
    const colW = UTIL / 4
    pdf.setFillColor(24, 28, 37)
    pdf.roundedRect(MARGEM, posY, UTIL, 16, 1.5, 1.5, 'F')
    const celulas = [
      { rotulo: 'Técnico',     valor: nomeTecnico            || relatorio.tecnico     || '—' },
      { rotulo: 'Responsável', valor: relatorio.responsavel  || '—' },
      { rotulo: 'Ocorrências', valor: qtdOcs   != null ? String(qtdOcs)   : String(ocorrencias.length) },
      { rotulo: 'Atividades',  valor: qtdAtivs != null ? String(qtdAtivs) : String(atividades.length) },
    ]
    celulas.forEach((cel, i) => {
      const x = MARGEM + i * colW
      if (i > 0) { pdf.setDrawColor(42, 48, 64); pdf.line(x, posY+2, x, posY+14) }
      pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(100,110,130)
      pdf.text(cel.rotulo, x + colW/2, posY+5.5, { align:'center' })
      pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(212,219,232)
      pdf.text(cel.valor,  x + colW/2, posY+12.5,{ align:'center' })
    })
    posY += 20
  }

  // Barra de seção com nome do técnico já incluído
  // ex: "OCORRÊNCIAS DO TURNO  —  João Silva"
  function tituloSecaoComTecnico(textoBase, nomeTecnico, cor) {
    // Registra o contexto da seção para que páginas de continuação possam repeti-lo
    definirSecaoAtual(textoBase, nomeTecnico, cor)
    verificarEspaco(10)
    pdf.setFillColor(...hexRGB(cor))
    pdf.roundedRect(MARGEM, posY, UTIL, 8.5, 1, 1, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255)
    const texto = nomeTecnico ? `${textoBase}  —  ${nomeTecnico.toUpperCase()}` : textoBase
    pdf.text(texto, MARGEM + 3.5, posY + 5.8)
    posY += 12
  }

  function linhaInfo(rotulo, valor) {
    const linhas = pdf.splitTextToSize(String(valor || '—'), UTIL - 42)
    const altura = linhas.length * 5.5 + 3
    verificarEspaco(altura)
    pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(100,110,130)
    pdf.text(rotulo + ':', MARGEM + 2, posY)
    pdf.setFont('helvetica','normal'); pdf.setTextColor(200,210,225)
    pdf.text(linhas, MARGEM + 40, posY)
    posY += altura
  }

  function desenharRetornoProducao(val, comentsDoItem) {
    if (!val && comentsDoItem.length === 0) return
    verificarEspaco(10)
    pdf.setFillColor(40, 44, 58)
    pdf.roundedRect(MARGEM+2, posY, UTIL-4, 7, 1, 1, 'F')
    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(160,140,200)
    pdf.text('RETORNO DA PRODUCAO', MARGEM+5, posY+5)
    posY += 10

    if (val) {
      const aprovado = val.tipo === 'aprovado'
      const corVal   = aprovado ? [46,204,113] : [224,80,80]
      const textoVal = aprovado ? '✅ APROVADO' : '❌ REPROVADO'
      const dataVal  = val.criado_em
        ? new Date(val.criado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
        : ''
      verificarEspaco(8)
      pdf.setFillColor(...corVal.map(v => Math.round(v*0.15)))
      pdf.roundedRect(MARGEM+2, posY, UTIL-4, 7, 1, 1, 'F')
      pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...corVal)
      pdf.text(textoVal, MARGEM+5, posY+5)
      pdf.setFont('helvetica','normal'); pdf.setTextColor(138,149,170)
      pdf.text(`por ${val.autor}${dataVal ? '  ·  '+dataVal : ''}`, MARGEM+38, posY+5)
      posY += 10
    }

    if (comentsDoItem.length > 0) {
      verificarEspaco(8)
      pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(100,110,130)
      pdf.text('Comentários:', MARGEM+5, posY)
      posY += 5
      for (const c of comentsDoItem) {
        const dataC = c.criado_em
          ? new Date(c.criado_em).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
          : ''
        verificarEspaco(7)
        pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(176,127,224)
        pdf.text(`${c.autor}${dataC ? '  ·  '+dataC : ''}`, MARGEM+5, posY)
        posY += 5
        const linhasC = pdf.splitTextToSize(c.texto, UTIL-12)
        const alturaC = linhasC.length * 5 + 3
        verificarEspaco(alturaC)
        pdf.setFont('helvetica','normal'); pdf.setTextColor(200,210,225)
        pdf.text(linhasC, MARGEM+5, posY)
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
    pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(100,110,130)
    pdf.text('Fotos:', MARGEM+2, posY)
    posY += 5

    const dados = []
    for (const foto of listaFotos) {
      const base64 = await urlParaBase64(foto.url)
      let props = null
      if (base64) { try { props = pdf.getImageProperties(base64) } catch { } }
      dados.push({ base64, props, legenda: (foto.legenda || '').trim() })
    }

    for (let i = 0; i < dados.length; i += 2) {
      const linha = dados.slice(i, i+2)
      const linhasLegendaPorItem = linha.map((d, col) => {
        const txt = d.legenda || `Foto ${i+col+1}`
        return pdf.splitTextToSize(txt, larguraFoto-2)
      })
      const alturaLegenda = Math.max(...linhasLegendaPorItem.map(l => l.length)) * 3.6 + 2
      verificarEspaco(alturaFoto + alturaLegenda + 6)
      linha.forEach((d, col) => {
        const x = MARGEM + col * (larguraFoto + 6)
        pdf.setDrawColor(42,48,64); pdf.setFillColor(20,23,31)
        pdf.roundedRect(x, posY, larguraFoto, alturaFoto, 1, 1, 'FD')
        if (d.base64 && d.props?.width && d.props?.height) {
          const imgRatio = d.props.width / d.props.height
          const boxRatio = larguraFoto / alturaFoto
          let lD, aD
          if (imgRatio > boxRatio) { lD = larguraFoto; aD = larguraFoto/imgRatio }
          else                     { aD = alturaFoto;  lD = alturaFoto*imgRatio  }
          const oX = x + (larguraFoto-lD)/2
          const oY = posY + (alturaFoto-aD)/2
          pdf.addImage(d.base64, (d.props.fileType||'JPEG').toUpperCase(), oX, oY, lD, aD, undefined, 'FAST')
        } else {
          pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(80,90,110)
          pdf.text('Foto indisponível', x+larguraFoto/2, posY+alturaFoto/2, {align:'center'})
        }
        pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(100,110,130)
        pdf.text(linhasLegendaPorItem[col], x+larguraFoto/2, posY+alturaFoto+4, {align:'center'})
      })
      posY += alturaFoto + alturaLegenda + 6
    }
  }

  // Agrupa itens por técnico preservando ordem de aparição
  function agruparPorTecnico(lista) {
    const grupos = []
    const mapa   = new Map()
    for (const item of lista) {
      const nome = (item.executor || item.autor || 'Sem técnico').trim()
      if (!mapa.has(nome)) {
        const g = { nome, itens: [] }
        mapa.set(nome, g)
        grupos.push(g)
      }
      mapa.get(nome).itens.push(item)
    }
    return grupos
  }

  // ── MONTAGEM ──────────────────────────────────────────────────────────────

  const corStatus = {
    Concluída:      '#2ecc71',
    'Em andamento': '#4a90e2',
    Pendente:       '#e05050',
  }

  // Agrupa TODOS os itens por técnico (ocorrências + atividades juntas)
  // A ordem de técnicos segue a ordem de aparição no relatório
  const todosTecnicos = agruparPorTecnico(itens)

  // Primeira página: fundo + cabeçalho completo (logo + título)
  cabecalho()
  // A tabela de resumo da primeira página mostra totais globais.
  // Se houver apenas um técnico, exibe o nome dele; se houver vários, exibe o do relatório.
  {
    const nomeResumo = todosTecnicos.length === 1 ? todosTecnicos[0].nome : (relatorio.tecnico || null)
    tabelaResumo(nomeResumo, null, null)
  }

  // ── Um bloco por técnico, com quebra de página entre eles ────────────────
  for (let gi = 0; gi < todosTecnicos.length; gi++) {
    const grupo = todosTecnicos[gi]

    const ocsTecnico   = grupo.itens.filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ')
    const ativsTecnico = grupo.itens.filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ')

    // A partir do segundo técnico: nova página com tabela de resumo do técnico
    if (gi > 0) {
      pdf.addPage()
      fundoNovaPagina()
      // Limpa o contexto de seção anterior — nova página começa do zero
      definirSecaoAtual(null, null, null)
      // Tabela de resumo específica deste técnico no topo da página dele
      tabelaResumo(grupo.nome, ocsTecnico.length, ativsTecnico.length)
    }
    // gi === 0: a tabela global já foi desenhada pelo cabecalho() acima — não repete

    // ── Ocorrências do técnico ──────────────────────────────────────────────
    if (ocsTecnico.length > 0) {
      tituloSecaoComTecnico('OCORRÊNCIAS DO TURNO', grupo.nome, '#e05c2a')

      for (const o of ocsTecnico) {
        const val = validacaoDoItem(o)
        const cms = comentariosDoItem(o)
        const num = ocorrencias.indexOf(o) + 1

        verificarEspaco(14)
        pdf.setFillColor(24, 28, 37)
        pdf.roundedRect(MARGEM, posY, UTIL, 10, 1, 1, 'F')
        pdf.setFillColor(224, 92, 42)
        pdf.rect(MARGEM, posY, 3.5, 10, 'F')
        pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(212,219,232)
        pdf.text(`Ocorrência ${num}`, MARGEM+6, posY+7)
        posY += 13

        linhaInfo('Equipamento',  o.equipamento || o.equip)
        linhaInfo('Sintoma',      o.sintoma)
        linhaInfo('Modo/Impacto', `${o.modo||'—'} / ${o.impacto||'—'}`)
        linhaInfo('Intervencao',  o.intervencao || o.tipo_int)
        const ini = o.horario_inicio || '', fim = o.horario_fim || ''
        const dh  = Number(o.duracao_h)||0, dm = Number(o.duracao_m)||0
        if (ini||fim) linhaInfo('Horario',
          `${ini||'—'} → ${fim||'—'}${(dh||dm)?'  ('+[dh?dh+'h':'',dm?dm+'min':''].filter(Boolean).join(' ')+')':''}`)
        linhaInfo('Solucao', o.solucao)

        await desenharFotos(o.fotos)
        desenharRetornoProducao(val, cms)

        posY += 2
        pdf.setDrawColor(42,48,64)
        pdf.line(MARGEM, posY, MARGEM+UTIL, posY)
        posY += 6
      }
    }

    // ── Atividades do técnico (continuam na mesma página se couber) ─────────
    if (ativsTecnico.length > 0) {
      // Pequeno espaço de separação entre ocorrências e atividades do mesmo técnico
      if (ocsTecnico.length > 0) posY += 4

      tituloSecaoComTecnico('ATIVIDADES PROGRAMADAS', grupo.nome, '#4a90e2')

      for (const a of ativsTecnico) {
        const cor = corStatus[a.status] || '#5c6680'
        const num = atividades.indexOf(a) + 1

        verificarEspaco(14)
        pdf.setFillColor(24, 28, 37)
        pdf.roundedRect(MARGEM, posY, UTIL, 10, 1, 1, 'F')
        pdf.setFillColor(...hexRGB(cor))
        pdf.rect(MARGEM, posY, 3.5, 10, 'F')
        pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(212,219,232)
        pdf.text(`Atividade ${num}`, MARGEM+6, posY+7)
        if (a.status) {
          pdf.setFontSize(8.5); pdf.setTextColor(...hexRGB(cor))
          pdf.text(a.status, MARGEM+UTIL-2, posY+7, {align:'right'})
        }
        posY += 13

        linhaInfo('Equipamento', a.equipamento || a.equip)
        linhaInfo('Descrição',   a.descricao   || a.desc)

        await desenharFotos(a.fotos)

        posY += 2
        pdf.setDrawColor(42,48,64)
        pdf.line(MARGEM, posY, MARGEM+UTIL, posY)
        posY += 6
      }
    }
  }

  // ── Numeração de páginas ──────────────────────────────────────────────────
  const totalPaginas = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(70,80,100)
    pdf.text(
      `Página ${i} de ${totalPaginas}  |  Gerado em ${new Date().toLocaleString('pt-BR')}`,
      LARGURA/2, 292, { align:'center' }
    )
  }

  pdf.save(`turno_${(relatorio.setor||'relatorio').replace(/\s+/g,'_')}_${relatorio.data||'sem_data'}.pdf`)
}