// Gancho que faz o app abrir automaticamente o relatório certo quando a
// pessoa toca numa notificação (de ocorrência ou atividade).
//
// Duas situações possíveis:
// 1) O app já estava aberto em alguma aba: o Service Worker manda uma
//    mensagem (postMessage) avisando qual relatório abrir.
// 2) O app estava fechado: o Service Worker abre uma aba nova com
//    "?relatorio=ID" na URL, e aqui a gente lê esse parâmetro assim que os
//    dados carregarem.

import { useEffect } from 'react'

export function useAbrirRelatorioDaNotificacao(abertos, historico, aoAbrir) {
  // Caso 1: app já aberto, mensagem chega via Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function aoReceberMensagem(evento) {
      if (evento.data?.tipo !== 'abrir-relatorio' || !evento.data.relatorioId) return
      const relatorio =
        abertos.find(r => r.id === evento.data.relatorioId) ||
        historico.find(r => r.id === evento.data.relatorioId)
      if (relatorio) aoAbrir(relatorio)
    }

    navigator.serviceWorker.addEventListener('message', aoReceberMensagem)
    return () => navigator.serviceWorker.removeEventListener('message', aoReceberMensagem)
  }, [abertos, historico, aoAbrir])

  // Caso 2: app aberto do zero com "?relatorio=ID" na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('relatorio')
    if (!id) return
    if (abertos.length === 0 && historico.length === 0) return // ainda carregando

    const relatorio = abertos.find(r => r.id === id) || historico.find(r => r.id === id)
    if (relatorio) aoAbrir(relatorio)

    // Limpa o parâmetro da URL pra não tentar abrir de novo depois
    window.history.replaceState({}, '', window.location.pathname)
  }, [abertos, historico, aoAbrir])
}
