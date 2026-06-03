// Gancho de filtragem e ordenação em memória — não faz chamadas ao banco.
// Segue o padrão leve dos outros hooks do projeto.

import { useState, useMemo, useCallback } from 'react'

export function useAlmoxFiltro({ lista, cabecalhos, obs }) {
  const [busca, setBusca]             = useState('')
  const [colunaOrdem, setColunaOrdem] = useState(null)
  const [direcao, setDirecao]         = useState('asc') // 'asc' | 'desc'

  // Alterna a coluna de ordenação; inverte a direção se for a mesma coluna
  const alternarOrdem = useCallback((coluna) => {
    setColunaOrdem(prev => {
      if (prev === coluna) {
        setDirecao(d => d === 'asc' ? 'desc' : 'asc')
        return coluna
      }
      setDirecao('asc')
      return coluna
    })
  }, [])

  // Filtra e ordena derivando da lista e da busca
  const linhasFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim()

    let linhas = q
      ? lista.filter(row =>
          cabecalhos.some(h => (row.cells[h] || '').toLowerCase().includes(q)) ||
          (obs[row.row_idx]?.descricao || '').toLowerCase().includes(q)
        )
      : [...lista]

    if (colunaOrdem) {
      linhas = [...linhas].sort((a, b) => {
        const va = (a.cells[colunaOrdem] || '').toLowerCase()
        const vb = (b.cells[colunaOrdem] || '').toLowerCase()
        return direcao === 'asc'
          ? va.localeCompare(vb, 'pt-BR')
          : vb.localeCompare(va, 'pt-BR')
      })
    }

    return linhas
  }, [lista, cabecalhos, obs, busca, colunaOrdem, direcao])

  return { busca, setBusca, colunaOrdem, direcao, alternarOrdem, linhasFiltradas }
}
