// Utilitário para ativar/desativar notificações push no celular.
//
// Como funciona (resumo):
// 1) O navegador/celular pede permissão de notificação ao usuário.
// 2) Se aceito, criamos uma "inscrição" (PushSubscription) junto ao serviço
//    de push do navegador (Google/Apple/Mozilla, dependendo do aparelho).
// 3) Essa inscrição é salva na tabela `push_inscricoes` do Supabase.
// 4) Quando alguém adiciona uma ocorrência em um relatório aberto, uma
//    Edge Function no Supabase (veja supabase/functions/notificar-ocorrencia)
//    é chamada automaticamente e envia a notificação para todas as
//    inscrições salvas — mesmo com o app fechado.
//
// IMPORTANTE (iOS/iPhone): a Apple só permite notificações push para o Safari
// quando o site foi "Adicionado à Tela de Início" (instalado como app).
// Em Android funciona tanto instalado quanto direto no Chrome.

import { bd, TABELA_PUSH_INSCRICOES } from './supabase'

// Chave pública VAPID — pode ficar exposta no código do cliente, ela não é
// secreta (só a privada é secreta, e essa fica apenas na Edge Function).
// Gerada com: node gerar_vapid.js (ver instruções em NOTIFICACOES_PUSH.md)
export const CHAVE_PUBLICA_VAPID =
  'BO8oIh2YtHxTRLvFZMUU_DI-J1WS9wZMYQlBx-RNls6-B3Yk_ciowC2gSBgq1CZI7_n5VIfdoDzsLYb1AMPK1dI'

// O navegador exige a chave pública em formato Uint8Array, não em texto.
function base64UrlParaUint8Array(base64Url) {
  const preenchimento = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + preenchimento).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(base64)
  const saida = new Uint8Array(bruto.length)
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i)
  return saida
}

// Verifica se este navegador/aparelho é capaz de receber push
export function suportaNotificacoesPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Estado atual: 'ativo' | 'inativo' | 'negado' | 'indisponivel'
export async function statusNotificacoes() {
  if (!suportaNotificacoesPush()) return 'indisponivel'
  if (Notification.permission === 'denied') return 'negado'

  const registro = await navigator.serviceWorker.ready
  const inscricaoAtual = await registro.pushManager.getSubscription()
  return inscricaoAtual ? 'ativo' : 'inativo'
}

// Pede permissão e inscreve este aparelho para receber notificações.
// `usuario`   = nome/login de quem está usando (só para exibição no Admin).
// `usuarioId` = id do usuário na tabela `usuarios` (permite ao Admin ativar/
//               desativar notificações dessa pessoa depois).
export async function ativarNotificacoes(usuario, usuarioId) {
  if (!suportaNotificacoesPush()) {
    throw new Error('Este navegador não suporta notificações push.')
  }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificação negada.')
  }

  const registro = await navigator.serviceWorker.ready

  let inscricao = await registro.pushManager.getSubscription()
  if (!inscricao) {
    inscricao = await registro.pushManager.subscribe({
      userVisibleOnly: true, // exigido pelos navegadores: toda push mostra uma notificação visível
      applicationServerKey: base64UrlParaUint8Array(CHAVE_PUBLICA_VAPID),
    })
  }

  const json = inscricao.toJSON()

  const { error } = await bd.from(TABELA_PUSH_INSCRICOES).upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      usuario: usuario || null,
      usuario_id: usuarioId != null ? String(usuarioId) : null,
      atualizado_em: Date.now(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) throw error
  return inscricao
}

// Cancela a inscrição neste aparelho (e remove do banco)
export async function desativarNotificacoes() {
  if (!suportaNotificacoesPush()) return

  const registro = await navigator.serviceWorker.ready
  const inscricao = await registro.pushManager.getSubscription()
  if (!inscricao) return

  const endpoint = inscricao.endpoint
  await inscricao.unsubscribe()
  await bd.from(TABELA_PUSH_INSCRICOES).delete().eq('endpoint', endpoint)
}
