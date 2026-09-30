// Busca por palavra-chave nas ocorrências dos relatórios do histórico.
//
// A busca é feita em TODOS os campos preenchidos da ocorrência (equipamento,
// sintoma, modo de falha, impacto, intervenção, solução, executor, horários…)
// e também no cabeçalho do relatório (setor, turno e data). Assim, qualquer
// palavra usada no preenchimento é encontrada, mesmo que um campo novo seja
// criado no futuro.
//
// Regras:
//  - ignora maiúsculas/minúsculas e acentos ("manutencao" acha "manutenção")
//  - várias palavras = todas precisam aparecer (E), em qualquer campo/ordem
//  - a data pode ser buscada tanto como 15/01/2024 quanto como 2024-01-15

// Campos internos que não fazem parte do preenchimento
const CAMPOS_IGNORADOS = new Set(['id', 'tipo', 'criado_em', 'atualizado_em'])

// Nomes amigáveis para os campos (usados na tela de resultados)
export const ROTULOS_CAMPOS = {
  equipamento: 'Equipamento',
  equip: 'Equipamento',
  sintoma: 'Sintoma',
  modo: 'Modo de falha',
  impacto: 'Impacto',
  intervencao: 'Intervenção',
  tipo_int: 'Intervenção',
  solucao: 'Solução',
  executor: 'Executor',
  autor: 'Autor',
}

// minúsculas + sem acentos
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// "2024-01-15" -> "15/01/2024" (mesma conversão usada em textoRelatorio.js)
function dataBR(iso) {
  return iso ? new Date(iso + 'T12:00').toLocaleDateString('pt-BR') : ''
}

function ehOcorrencia(item) {
  return item && (item.tipo === 'ocorrencia' || item.tipo === 'occ')
}

// Transforma o histórico em uma lista plana de ocorrências, cada uma já com
// o texto pesquisável pré-calculado (evita recalcular a cada tecla digitada).
export function extrairOcorrencias(historico) {
  const resultado = []

  ;(historico || []).forEach((relatorio, indiceRelatorio) => {
    if (!relatorio) return
    const ocorrencias = (relatorio.itens || []).filter(ehOcorrencia)

    ocorrencias.forEach((item, indice) => {
      const valores = Object.entries(item)
        .filter(([campo, valor]) =>
          !CAMPOS_IGNORADOS.has(campo) &&
          valor !== null && valor !== undefined && valor !== '' &&
          typeof valor !== 'object')
        .map(([, valor]) => String(valor))

      // Legendas das fotos também são texto preenchido pelo usuário
      ;(item.fotos || []).forEach(f => { if (f?.legenda) valores.push(String(f.legenda)) })

      const cabecalho = [relatorio.setor, relatorio.turno, relatorio.data, dataBR(relatorio.data)]
        .filter(Boolean)
        .map(String)

      resultado.push({
        chave: `${relatorio.id ?? indiceRelatorio}-${item.id ?? indice}`,
        relatorio,
        item,
        numero: indice + 1,
        textoBusca: normalizar([...cabecalho, ...valores].join(' \n ')),
      })
    })
  })

  // Mais recentes primeiro
  resultado.sort((a, b) => String(b.relatorio.data || '').localeCompare(String(a.relatorio.data || '')))
  return resultado
}

// Separa o que foi digitado em palavras normalizadas
export function termosDaBusca(consulta) {
  return normalizar(consulta).split(/\s+/).filter(Boolean)
}

// Mantém só as ocorrências que contêm TODAS as palavras digitadas
export function buscarOcorrencias(ocorrencias, consulta) {
  const termos = termosDaBusca(consulta)
  if (termos.length === 0) return ocorrencias
  return ocorrencias.filter(o => termos.every(t => o.textoBusca.includes(t)))
}

// Divide um texto em trechos { texto, destaque } para realçar as palavras
// encontradas, sem perder os acentos/maiúsculas do texto original.
export function trechosComDestaque(texto, termos) {
  const original = String(texto ?? '')
  if (!termos.length || !original) return [{ texto: original, destaque: false }]

  // Texto normalizado + mapa "posição normalizada -> posição original"
  let norm = ''
  const mapa = []
  for (let i = 0; i < original.length; i++) {
    const parte = normalizar(original[i])
    for (let k = 0; k < parte.length; k++) { norm += parte[k]; mapa.push(i) }
  }

  // Intervalos (no texto original) que devem ficar destacados
  const intervalos = []
  termos.forEach(termo => {
    let pos = norm.indexOf(termo)
    while (pos !== -1) {
      intervalos.push([mapa[pos], mapa[pos + termo.length - 1] + 1])
      pos = norm.indexOf(termo, pos + termo.length)
    }
  })
  if (intervalos.length === 0) return [{ texto: original, destaque: false }]

  // Junta intervalos que se sobrepõem
  intervalos.sort((a, b) => a[0] - b[0])
  const unidos = [intervalos[0].slice()]
  for (const [ini, fim] of intervalos.slice(1)) {
    const ultimo = unidos[unidos.length - 1]
    if (ini <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], fim)
    else unidos.push([ini, fim])
  }

  const trechos = []
  let cursor = 0
  unidos.forEach(([ini, fim]) => {
    if (ini > cursor) trechos.push({ texto: original.slice(cursor, ini), destaque: false })
    trechos.push({ texto: original.slice(ini, fim), destaque: true })
    cursor = fim
  })
  if (cursor < original.length) trechos.push({ texto: original.slice(cursor), destaque: false })
  return trechos
}
