// Gancho para notificação em tempo real SEM DEPENDER de push/FCM/Google.
//
// Como funciona: o app já escuta mudanças no banco em tempo real (via
// Supabase Realtime, em useRelatorios.js). Este gancho compara a lista de
// itens de cada relatório aberto a cada atualização e, se detectar uma
// ocorrência nova, chama diretamente `registration.showNotification(...)`
// — sem passar pelo servidor de push do Google. É a mesma função que o
// Service Worker usa quando o push chega, só que disparada localmente.
//
// Limitação (inevitável, não é algo que dá pra contornar): só funciona
// enquanto o app está aberto — em primeiro plano ou minimizado, mas com o
// processo do navegador vivo. Se o app for fechado de vez, isso não dispara
// (aí só o push via Google/Apple funciona, se estiver configurado).

import { useEffect, useRef } from 'react'

function ehOcorrencia(item) {
  return !!item && (item.tipo === 'ocorrencia' || item.tipo === 'occ')
}

async function mostrarNotificacaoLocal(titulo, opcoes) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      // No Android, se o site tem um Service Worker ativo, o navegador exige
      // que a notificação seja mostrada por ele (não dá pra usar `new
      // Notification()` direto) — mas isso continua sendo 100% local,
      // nenhum dado passa pelo Google nesse caminho.
      const registro = await navigator.serviceWorker.ready
      await registro.showNotification(titulo, opcoes)
    } else {
      new Notification(titulo, opcoes)
    }
  } catch (erro) {
    console.warn('Não foi possível mostrar a notificação local:', erro)
  }
}

export function useNotificacoesTempoReal(abertos) {
  const itensAnteriores = useRef(null) // Map<id_do_relatorio, quantidadeDeItens>
  const primeiraCarga = useRef(true)

  useEffect(() => {
    if (!Array.isArray(abertos)) return

    const mapaAtual = new Map(
      abertos.map((r) => [r.id, Array.isArray(r.itens) ? r.itens.length : 0])
    )

    // Na primeira carga só grava o estado atual, sem notificar — senão
    // notificaria tudo que já existia assim que a pessoa abre o app.
    if (primeiraCarga.current) {
      itensAnteriores.current = mapaAtual
      primeiraCarga.current = false
      return
    }

    for (const relatorio of abertos) {
      const qtdAntes = itensAnteriores.current.get(relatorio.id) ?? 0
      const itens = Array.isArray(relatorio.itens) ? relatorio.itens : []
      if (itens.length <= qtdAntes) continue

      const novosItens = itens.slice(qtdAntes).filter(ehOcorrencia)
      for (const ocorrencia of novosItens) {
        const corpo =
          [ocorrencia.equipamento, ocorrencia.sintoma].filter(Boolean).join(': ') ||
          `Ocorrência registrada no turno da ${relatorio.turno || ''}`.trim()

        mostrarNotificacaoLocal(`🔧 Nova ocorrência — ${relatorio.setor || 'Setor'}`, {
          body: corpo,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [120, 60, 120],
          tag: `relatorio-${relatorio.id}`,
          data: { url: '/' },
        })
      }
    }

    itensAnteriores.current = mapaAtual
  }, [abertos])
}
