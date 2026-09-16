import { EMOJI_STATUS } from './constantes'

// Monta a linha de cabeçalho: setor, data e turno
function cabecalho(relatorio) {
  // Converte data do formato ISO (2024-01-15) para BR (15/01/2024)
  const data = relatorio.data
    ? new Date(relatorio.data + 'T12:00').toLocaleDateString('pt-BR')
    : '—'

  return `Setor: ${relatorio.setor || '—'}  |  Data: ${data}  |  Turno: ${relatorio.turno || '—'}`
}

// Monta o texto apenas das ocorrências
export function textoOcorrencias(relatorio) {
  // Filtra só os itens do tipo 'ocorrencia'
  const lista = (relatorio.itens || []).filter(i => i.tipo === 'ocorrencia' || i.tipo === 'occ')

  if (lista.length === 0) {
    return `📋 *OCORRÊNCIAS DO TURNO*\n${cabecalho(relatorio)}\n\nNenhuma ocorrência registrada.`
  }

  const linhas = ['📋 *OCORRÊNCIAS DO TURNO*', cabecalho(relatorio)]

  lista.forEach((item, indice) => {
    linhas.push(
      '\n─────────────────────',
      `🔧 *OCORRÊNCIA ${indice + 1}${item.executor || item.autor ? '  —  ' + (item.executor || item.autor) : ''}*`,
      `Equipamento: ${item.equipamento || item.equip || '—'}`,
      `Sintoma: ${item.sintoma || '—'}`,
      `Modo de falha: ${item.modo || '—'}  |  Impacto: ${item.impacto || '—'}`,
      `Intervenção: ${item.intervencao || item.tipo_int || '—'}`
    )

    // Horário (início/fim + duração), igual ao exibido no PDF
    const ini = item.horario_inicio || ''
    const fim = item.horario_fim || ''
    const dh = Number(item.duracao_h) || 0
    const dm = Number(item.duracao_m) || 0
    if (ini || fim) {
      const duracao = (dh || dm)
        ? '  (' + [dh ? dh + 'h' : '', dm ? dm + 'min' : ''].filter(Boolean).join(' ') + ')'
        : ''
      linhas.push(`Horário: ${ini || '—'} → ${fim || '—'}${duracao}`)
    }

    linhas.push(`Solução: ${item.solucao || '—'}`)
  })

  linhas.push('─────────────────────')
  return linhas.join('\n')
}

// Monta o texto apenas das atividades
export function textoAtividades(relatorio) {
  // Filtra só os itens do tipo 'atividade'
  const lista = (relatorio.itens || []).filter(i => i.tipo === 'atividade'  || i.tipo === 'ativ')

  if (lista.length === 0) {
    return `📅 *ATIVIDADES *\n${cabecalho(relatorio)}\n\nNenhuma atividade registrada.`
  }

  const linhas = ['📅 *ATIVIDADES*', cabecalho(relatorio)]

  lista.forEach((item, indice) => {
    linhas.push(
      '\n─────────────────────',
      `${EMOJI_STATUS[item.status] || '•'} *ATIVIDADE ${indice + 1}${item.executor || item.autor ? '  —  ' + (item.executor || item.autor) : ''}*`,
      `Equipamento: ${item.equipamento || item.equip || '—'}`,
      `Atividade: ${item.descricao || item.desc || item.desc || '—'}`,
      `Status: ${item.status || '—'}`
    )
  })

  linhas.push('─────────────────────')
  return linhas.join('\n')
}

// Junta ocorrências + atividades em um texto só
export function textoCompleto(relatorio) {
  return textoOcorrencias(relatorio) + '\n\n' + textoAtividades(relatorio)
}
