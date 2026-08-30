// Gancho React para notificações push — pede a permissão automaticamente
// assim que a pessoa faz login (sem precisar clicar em nada), e também
// controla o botão manual 🔔 na barra superior (pra quem recusou sem
// querer e quer tentar de novo, ou quer desativar).

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  suportaNotificacoesPush,
  statusNotificacoes,
  ativarNotificacoes,
  desativarNotificacoes,
} from '../utilitarios/pushNotificacoes'

export function useNotificacoesPush(sessao, mostrarAviso) {
  // 'carregando' | 'ativo' | 'inativo' | 'negado' | 'indisponivel'
  const [status, setStatus] = useState('carregando')
  const jaTentouAutomatico = useRef(false)

  const atualizarStatus = useCallback(async () => {
    if (!suportaNotificacoesPush()) {
      setStatus('indisponivel')
      return
    }
    setStatus(await statusNotificacoes())
  }, [])

  useEffect(() => {
    atualizarStatus()
  }, [atualizarStatus])

  // Pede a permissão sozinho, uma vez por login, assim que a pessoa entra.
  // Se o navegador já tiver "negado" antes, ele nem mostra a caixinha de
  // novo (isso é uma trava do próprio navegador — nenhum site consegue
  // forçar depois de um "não").
  useEffect(() => {
    if (!sessao || jaTentouAutomatico.current || status !== 'inativo') return
    jaTentouAutomatico.current = true

    ;(async () => {
      try {
        const nome = sessao?.tecnico || sessao?.login || sessao?.nome || ''
        await ativarNotificacoes(nome, sessao?.id)
        setStatus('ativo')
        mostrarAviso?.('🔔 Notificações ativadas neste aparelho!')
      } catch {
        // A pessoa fechou/recusou a caixinha do navegador — sem problema,
        // ela ainda pode tentar de novo tocando no sino manualmente.
        await atualizarStatus()
      }
    })()
  }, [sessao, status, atualizarStatus, mostrarAviso])

  async function alternar() {
    try {
      if (status === 'ativo') {
        await desativarNotificacoes()
        setStatus('inativo')
        mostrarAviso?.('🔕 Notificações desativadas.')
      } else {
        setStatus('carregando')
        const nome = sessao?.tecnico || sessao?.login || sessao?.nome || ''
        await ativarNotificacoes(nome, sessao?.id)
        setStatus('ativo')
        mostrarAviso?.('🔔 Notificações ativadas neste aparelho!')
      }
    } catch (erro) {
      await atualizarStatus()
      mostrarAviso?.(erro.message || 'Não foi possível alterar as notificações.', true)
    }
  }

  return { status, alternar }
}
