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
    return null // retorna null se não conseguir carregar
  }
}

export async function gerarPDF(relatorio) {
  await carregarJsPDF()
  const { jsPDF } = window.jspdf

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const LARGURA = 210
  const MARGEM = 14
  const UTIL = LARGURA - MARGEM * 2 // 182mm de largura útil
  let posY = MARGEM

  // Formata a data para exibição (ex: 19/05/2026)
  const dataFormatada = relatorio.data
    ? new Date(relatorio.data + 'T12:00').toLocaleDateString('pt-BR')
    : '—'

  const ocorrencias = (relatorio.itens || []).filter(i => i.tipo === 'ocorrencia')
  const atividades = (relatorio.itens || []).filter(i => i.tipo === 'atividade')

  // Converte cor hex (#rrggbb) para array [r, g, b]
  function hexRGB(hex) {
    hex = hex.replace('#', '')
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }

  // Verifica se cabe mais conteúdo; se não, cria nova página com fundo escuro
  function verificarEspaco(altura) {
    if (posY + altura > 284) {
      pdf.addPage()
      pdf.setFillColor(15, 17, 23)
      pdf.rect(0, 0, 210, 297, 'F')
      cabecalho()
    }
  }

  // Desenha o cabeçalho (repetido em cada página)
  function cabecalho() {
    pdf.setFillColor(24, 28, 37)
    pdf.rect(0, 0, 210, 20, 'F')
    pdf.setFillColor(240, 165, 0) // linha âmbar
    pdf.rect(0, 19, 210, 1.5, 'F')

    // Título
    pdf.setFontSize(13)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(240, 165, 0)
    pdf.text('PASSAGEM DE TURNO — MANUTENÇÃO', MARGEM, 11)

    // Subtítulo
    pdf.setFontSize(8.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(138, 149, 170)
    pdf.text(
      `${relatorio.setor || '—'}   |   ${dataFormatada}   |   Turno: ${relatorio.turno || '—'}`,
      MARGEM,
      17
    )
    posY = 26
  }

  // Tabela de resumo: Técnico | Responsável | Ocorrências | Atividades
  function tabelaResumo() {
    verificarEspaco(20)

    const colW = UTIL / 4

    // Fundo da tabela
    pdf.setFillColor(24, 28, 37)
    pdf.roundedRect(MARGEM, posY, UTIL, 16, 1.5, 1.5, 'F')

    const celulas = [
      { rotulo: 'Técnico', valor: relatorio.tecnico || '—' },
      { rotulo: 'Responsável', valor: relatorio.responsavel || '—' },
      { rotulo: 'Ocorrências', valor: String(ocorrencias.length) },
      { rotulo: 'Atividades', valor: String(atividades.length) },
    ]

    celulas.forEach((cel, i) => {
      const x = MARGEM + i * colW

      // Linha divisória entre células
      if (i > 0) {
        pdf.setDrawColor(42, 48, 64)
        pdf.line(x, posY + 2, x, posY + 14)
      }

      // Rótulo cinza
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 110, 130)
      pdf.text(cel.rotulo, x + colW / 2, posY + 5.5, { align: 'center' })

      // Valor branco em destaque
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(212, 219, 232)
      pdf.text(cel.valor, x + colW / 2, posY + 12.5, { align: 'center' })
    })

    posY += 20
  }

  // Faixa de título de seção
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

  // Linha "Rótulo: Valor" dentro de um card de item
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

  // Desenha fotos do item — 2 por linha, tamanho maior, qualidade FAST
  async function desenharFotos(listaFotos) {
    if (!listaFotos?.length) return

    const larguraFoto = (UTIL - 6) / 2
    const alturaFoto = larguraFoto * 0.68 // proporção aprox. 3:2

    // Rótulo "Fotos:"
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
        // FAST = sem compressão extra → melhor qualidade de imagem
        pdf.addImage(base64, 'JPEG', x, posY, larguraFoto, alturaFoto, undefined, 'FAST')
      } else {
        // Placeholder cinza escuro se a foto não carregar
        pdf.setFillColor(30, 35, 48)
        pdf.roundedRect(x, posY, larguraFoto, alturaFoto, 1, 1, 'F')
        pdf.setFontSize(7.5)
        pdf.setTextColor(80, 90, 110)
        pdf.text('Foto indisponível', x + larguraFoto / 2, posY + alturaFoto / 2, {
          align: 'center',
        })
      }

      // Legenda abaixo da foto
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 110, 130)
      pdf.text(`Foto ${i + 1}`, x + larguraFoto / 2, posY + alturaFoto + 4, { align: 'center' })

      coluna++
      if (coluna >= 2) {
        coluna = 0
        posY += alturaFoto + 8
      }
    }
    if (coluna > 0) posY += alturaFoto + 8
  }

  // ── MONTAGEM DO PDF ────────────────────────────────────────────────────────

  // Fundo escuro na primeira página
  pdf.setFillColor(15, 17, 23)
  pdf.rect(0, 0, 210, 297, 'F')

  cabecalho()
  tabelaResumo()

  // ── Seção: Ocorrências ────────────────────────────────────────────────────
  if (ocorrencias.length > 0) {
    tituloSecao('OCORRÊNCIAS DO TURNO', '#e05c2a')

    for (let i = 0; i < ocorrencias.length; i++) {
      const o = ocorrencias[i]

      verificarEspaco(14)

      // Card do item com barra lateral laranja
      pdf.setFillColor(24, 28, 37)
      pdf.roundedRect(MARGEM, posY, UTIL, 10, 1, 1, 'F')
      pdf.setFillColor(224, 92, 42)
      pdf.rect(MARGEM, posY, 3.5, 10, 'F')

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(212, 219, 232)
      pdf.text(`Ocorrência ${i + 1}${o.autor ? '  —  ' + o.autor : ''}`, MARGEM + 6, posY + 7)
      posY += 13

      linhaInfo('Equipamento', o.equipamento)
      linhaInfo('Sintoma', o.sintoma)
      linhaInfo('Modo/Impacto', `${o.modo || '—'} / ${o.impacto || '—'}`)
      linhaInfo('Intervenção', o.intervencao)
      linhaInfo('Solução', o.solucao)

      await desenharFotos(o.fotos)

      // Divisória
      posY += 2
      pdf.setDrawColor(42, 48, 64)
      pdf.line(MARGEM, posY, MARGEM + UTIL, posY)
      posY += 6
    }
  }

  // ── Seção: Atividades ─────────────────────────────────────────────────────
  if (atividades.length > 0) {
    posY += 2
    tituloSecao('ATIVIDADES PROGRAMADAS', '#4a90e2')

    const corStatus = {
      Concluída: '#2ecc71',
      'Em andamento': '#4a90e2',
      Pendente: '#e05050',
    }

    for (let i = 0; i < atividades.length; i++) {
      const a = atividades[i]
      const cor = corStatus[a.status] || '#5c6680'

      verificarEspaco(14)

      // Card do item com barra lateral colorida pelo status
      pdf.setFillColor(24, 28, 37)
      pdf.roundedRect(MARGEM, posY, UTIL, 10, 1, 1, 'F')
      pdf.setFillColor(...hexRGB(cor))
      pdf.rect(MARGEM, posY, 3.5, 10, 'F')

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(212, 219, 232)
      pdf.text(`Atividade ${i + 1}${a.autor ? '  —  ' + a.autor : ''}`, MARGEM + 6, posY + 7)

      // Status no canto direito
      if (a.status) {
        pdf.setFontSize(8.5)
        pdf.setTextColor(...hexRGB(cor))
        pdf.text(a.status, MARGEM + UTIL - 2, posY + 7, { align: 'right' })
      }

      posY += 13

      linhaInfo('Equipamento', a.equipamento)
      linhaInfo('Descrição', a.descricao)

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
      LARGURA / 2,
      292,
      { align: 'center' }
    )
  }

  // Salva e baixa o arquivo
  pdf.save(
    `turno_${(relatorio.setor || 'relatorio').replace(/\s+/g, '_')}_${relatorio.data || 'sem_data'}.pdf`
  )
}
