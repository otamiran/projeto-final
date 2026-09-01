// Edge Function: notificar-atendimento
//
// Chamada automaticamente pelo Supabase (Database Webhook) toda vez que a
// tabela `ronda_atendimentos_manutencao` recebe um INSERT ou UPDATE.
// Envia uma notificação push (inclusive com o app fechado) quando um
// atendimento COMEÇA (iniciado_em passa a existir) ou TERMINA
// (finalizado_em passa a existir) — mesmo mecanismo usado para
// ocorrências novas em notificar-ocorrencia/index.ts.
//
// Configuração necessária (ver NOTIFICACOES_PUSH.md na raiz do projeto):
//   1. As mesmas chaves VAPID já configuradas para notificar-ocorrencia
//      valem aqui também (são os mesmos secrets do projeto).
//   2. supabase functions deploy notificar-atendimento
//   3. Criar um Database Webhook (Dashboard → Database → Webhooks) para
//      INSERT/UPDATE em ronda_atendimentos_manutencao, apontando para
//      esta função.
//   4. A tabela precisa estar com REPLICA IDENTITY FULL para o webhook
//      mandar o "old_record" completo nos UPDATEs — já incluído em
//      supabase/sql/ronda_schema.sql.

import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:contato@example.com'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

async function buscarInscricoes() {
  const resposta = await fetch(`${SUPABASE_URL}/rest/v1/push_inscricoes?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!resposta.ok) return []
  return await resposta.json()
}

async function buscarUsuariosComNotificacaoDesativada(): Promise<Set<string>> {
  const resposta = await fetch(
    `${SUPABASE_URL}/rest/v1/usuarios?select=id&notificacoes_ativas=eq.false`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  )
  if (!resposta.ok) return new Set()
  const linhas = await resposta.json()
  return new Set(linhas.map((u: any) => String(u.id)))
}

async function removerInscricao(endpoint: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_inscricoes?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
}

Deno.serve(async (req) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response('Chaves VAPID não configuradas nos secrets da função.', { status: 500 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response('Corpo inválido', { status: 400 })
  }

  // Formato padrão de um Database Webhook do Supabase:
  // { type: 'INSERT' | 'UPDATE' | 'DELETE', table, schema, record, old_record }
  if (payload.type !== 'UPDATE' && payload.type !== 'INSERT') {
    return new Response('ignorado', { status: 200 })
  }

  const atual  = payload.record ?? {}
  const antiga = payload.old_record ?? {}

  const iniciouAgora = !!atual.iniciado_em && !antiga.iniciado_em
  const concluiuAgora = !!atual.finalizado_em && !antiga.finalizado_em

  if (!iniciouAgora && !concluiuAgora) {
    return new Response('sem mudança relevante para notificar', { status: 200 })
  }

  const todasInscricoes = await buscarInscricoes()
  const idsDesativados = await buscarUsuariosComNotificacaoDesativada()
  const inscricoes = todasInscricoes.filter(
    (i: any) => !i.usuario_id || !idsDesativados.has(String(i.usuario_id))
  )

  if (inscricoes.length === 0) {
    return new Response('nenhum aparelho inscrito (ou todos desativados)', { status: 200 })
  }

  const manutentor = atual.manutentor_nome || 'alguém'
  const equipamento = atual.estacao_nome ? ` (${atual.estacao_nome})` : ''

  const titulo = iniciouAgora
    ? `🔧 Manutenção iniciada — ${manutentor}`
    : `✅ Manutenção concluída — ${manutentor}`
  const corpo = iniciouAgora
    ? `Atendimento em andamento${equipamento}${atual.descricao ? `\n${atual.descricao}` : ''}`
    : `Atendimento encerrado${equipamento}`

  const dadosNotificacao = JSON.stringify({
    titulo,
    corpo,
    url: '/',
    tag: `atendimento-${atual.id}`,
  })

  const resultados: any[] = []
  for (const inscricao of inscricoes) {
    const assinatura = {
      endpoint: inscricao.endpoint,
      keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
    }
    try {
      await webpush.sendNotification(assinatura, dadosNotificacao)
      resultados.push({ endpoint: inscricao.endpoint, ok: true })
    } catch (erro: any) {
      if (erro?.statusCode === 404 || erro?.statusCode === 410) {
        await removerInscricao(inscricao.endpoint)
      }
      resultados.push({
        endpoint: inscricao.endpoint,
        ok: false,
        statusCode: erro?.statusCode ?? null,
        erro: String(erro),
      })
    }
  }

  return new Response(JSON.stringify({ ok: true, enviados: resultados.length, resultados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
