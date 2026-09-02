// Agrupa uma lista de FCAs por dia de criação (para exibição colapsável).
// Recebe a lista já ordenada (mais recente primeiro, como vem de useFCAs) e
// devolve grupos na mesma ordem, cada um com uma chave estável (AAAA-MM-DD)
// e um rótulo amigável ("Hoje", "Ontem" ou a data por extenso).

function chaveDia(timestamp) {
  const d = new Date(timestamp)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function rotuloDia(chave) {
  const hoje  = chaveDia(Date.now())
  const ontem = chaveDia(Date.now() - 24 * 60 * 60 * 1000)

  if (chave === hoje)  return 'Hoje'
  if (chave === ontem) return 'Ontem'

  const [ano, mes, dia] = chave.split('-')
  const data = new Date(`${chave}T12:00`)
  const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' })
  const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)
  return `${diaSemanaCap}, ${dia}/${mes}/${ano}`
}

export function agruparFCAsPorDia(fcas) {
  const mapa = new Map()

  for (const fca of fcas) {
    const chave = fca.criado_em ? chaveDia(fca.criado_em) : 'sem-data'
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        rotulo: chave === 'sem-data' ? 'Sem data' : rotuloDia(chave),
        itens: [],
      })
    }
    mapa.get(chave).itens.push(fca)
  }

  // fcas já vem ordenado do mais recente pro mais antigo (useFCAs), então
  // a ordem de inserção no Map já preserva os grupos do mais recente pro mais antigo
  return Array.from(mapa.values())
}
