// Todas as operações com o banco de dados do Almoxarifado.
// Importa o cliente 'bd' do supabase.js do projeto principal.

import { bd } from '../utilitarios/supabase'
import { TABELA_LISTA, TABELA_OBS, PAGINA, LOTE } from './constantes'

// ── Carrega a lista completa com paginação ────────────────────────────────
// Retorna { lista: [], obs: {} } ou lança erro.
export async function carregarTudo(aoProgressoMsg) {
  // Lista principal
  let lista = []
  let inicio = 0
  while (true) {
    const { data: pagina, error } = await bd
      .from(TABELA_LISTA)
      .select('*')
      .order('row_idx', { ascending: true })
      .range(inicio, inicio + PAGINA - 1)
    if (error) throw error
    if (!pagina?.length) break
    lista = lista.concat(pagina)
    aoProgressoMsg?.(`Carregando... ${lista.length} itens`)
    if (pagina.length < PAGINA) break
    inicio += PAGINA
  }

  // Observações
  let dadosObs = []
  inicio = 0
  while (true) {
    const { data: pagina, error } = await bd
      .from(TABELA_OBS)
      .select('*')
      .range(inicio, inicio + PAGINA - 1)
    if (error) throw error
    if (!pagina?.length) break
    dadosObs = dadosObs.concat(pagina)
    if (pagina.length < PAGINA) break
    inicio += PAGINA
  }

  // Monta mapa { row_idx -> objeto obs }
  const obs = {}
  dadosObs.forEach(d => { obs[d.row_idx] = d })

  return { lista, obs }
}

// ── Importa planilha Excel/CSV ───────────────────────────────────────────
// Recebe o arquivo (File), chama aoProgresso(atual, total) em cada lote.
// Retorna o total de itens importados.
export async function importarPlanilha(arquivo, aoProgresso) {
  // Carrega SheetJS sob demanda — sem impacto no bundle principal
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s   = document.createElement('script')
      s.src     = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
      s.onload  = res
      s.onerror = rej
      document.head.appendChild(s)
    })
  }

  const buffer = await arquivo.arrayBuffer()
  const wb     = window.XLSX.read(buffer, { type: 'array' })
  const ws     = wb.Sheets[wb.SheetNames[0]]
  const linhas = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (!linhas.length) throw new Error('Planilha vazia.')

  const cabecalhos = linhas[0].map(h => String(h).trim()).filter(Boolean)
  const itens = linhas
    .slice(1)
    .filter(row => row.some(c => c !== ''))
    .map((row, idx) => {
      const cells = {}
      cabecalhos.forEach((h, i) => { cells[h] = String(row[i] ?? '').trim() })
      return { row_idx: idx, cells, headers: cabecalhos }
    })

  if (!itens.length) throw new Error('Nenhum dado encontrado.')

  // Limpa as tabelas existentes
  await bd.from(TABELA_LISTA).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await bd.from(TABELA_OBS).delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Insere em lotes
  for (let i = 0; i < itens.length; i += LOTE) {
    const lote = itens.slice(i, i + LOTE)
    const { error } = await bd.from(TABELA_LISTA).insert(lote)
    if (error) throw error
    aoProgresso?.(Math.min(i + LOTE, itens.length), itens.length)
  }

  return itens.length
}

// ── Limpa toda a lista e observações ─────────────────────────────────────
export async function limparTudo() {
  await bd.from(TABELA_LISTA).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await bd.from(TABELA_OBS).delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

// ── Salva / atualiza / remove uma observação ─────────────────────────────
// obs = objeto existente do mapa ou undefined
// Retorna o objeto salvo, ou null se removido.
export async function salvarObs(rowIdx, texto, autor, obsExistente) {
  if (texto) {
    const payload = {
      row_idx:       rowIdx,
      descricao:     texto,
      autor,
      atualizado_em: Date.now(),
    }
    if (obsExistente?.id) {
      await bd.from(TABELA_OBS).update(payload).eq('id', obsExistente.id)
      return { ...obsExistente, ...payload }
    } else {
      const { data, error } = await bd.from(TABELA_OBS).insert(payload).select().single()
      if (error) throw error
      return data
    }
  } else if (obsExistente?.id) {
    await bd.from(TABELA_OBS).delete().eq('id', obsExistente.id)
    return null
  }
  return null
}
