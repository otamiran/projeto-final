// Gancho: detecta relatórios ABERTOS duplicados (mesmo setor + turno + data)
// e oferece uni-los em um único relatório.
//
// Por que isso pode acontecer mesmo com as travas existentes: a restrição
// única no banco (setor+turno+data) evita duplicatas em condições normais,
// mas registros antigos, reaberturas do Histórico ou uma falha pontual de
// rede podem deixar dois relatórios abertos para a mesma combinação. Em vez
// de simplesmente travar, avisamos o usuário e — com a confirmação dele —
// juntamos os itens de todos em um só relatório (o mais antigo é mantido, os
// demais são apagados).

import { useEffect, useRef } from 'react'
import { bd, TABELA_ABERTOS } from '../utilitarios/supabase'

export function useMesclarDuplicados(abertos, pedir, mostrarAviso, recarregar) {
  // Guarda combinações de IDs já perguntadas nesta sessão, para não ficar
  // repetindo a pergunta a cada atualização em tempo real enquanto o
  // usuário ainda não respondeu (ou recusou) a anterior.
  const perguntados = useRef(new Set())

  useEffect(() => {
    if (!Array.isArray(abertos) || abertos.length < 2) return

    // Agrupa os relatórios abertos por setor + turno + data
    const grupos = new Map()
    for (const r of abertos) {
      if (!r.setor || !r.turno || !r.data) continue
      const chave = `${r.setor}|${r.turno}|${r.data}`
      if (!grupos.has(chave)) grupos.set(chave, [])
      grupos.get(chave).push(r)
    }

    // Só trata um grupo por vez — o modal de confirmação é único; assim que
    // esse for resolvido, o recarregar() dispara este efeito de novo e o
    // próximo grupo (se ainda existir) é tratado em seguida.
    for (const [chave, lista] of grupos) {
      if (lista.length < 2) continue

      const idsOrdenados = lista.map(r => r.id).slice().sort().join(',')
      const chaveCompleta = `${chave}::${idsOrdenados}`
      if (perguntados.current.has(chaveCompleta)) continue
      perguntados.current.add(chaveCompleta)

      // O mais antigo (criado_em menor) vira o relatório "principal";
      // os demais são fundidos nele e depois excluídos.
      const ordenados = [...lista].sort((a, b) => (a.criado_em || 0) - (b.criado_em || 0))
      const [principal, ...outros] = ordenados

      pedir(
        `Foram encontrados ${lista.length} relatórios abertos para o mesmo setor, turno e dia ` +
        `(${principal.setor} — ${principal.turno} — ${principal.data ? new Date(principal.data + 'T12:00').toLocaleDateString('pt-BR') : ''}). ` +
        `Eles serão unidos em um único relatório. Deseja continuar?`,
        async () => {
          try {
            const itensUnidos = [...(principal.itens || [])]
            for (const outro of outros) {
              itensUnidos.push(...(outro.itens || []))
            }

            await bd.from(TABELA_ABERTOS)
              .update({ itens: itensUnidos, updated_at: Date.now() })
              .eq('id', principal.id)

            for (const outro of outros) {
              await bd.from(TABELA_ABERTOS).delete().eq('id', outro.id)
            }

            mostrarAviso('✓ Relatórios duplicados unidos em um único relatório!')
            recarregar()
          } catch (e) {
            mostrarAviso('Erro ao unir relatórios duplicados: ' + e.message, true)
          }
        }
      )

      break // um grupo por vez
    }
  }, [abertos])
}
