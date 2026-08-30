// Edge Function: notificar-ocorrencia
//
// Chamada automaticamente pelo Supabase (Database Webhook) toda vez que a
// tabela `relatorios_abertos` recebe um INSERT ou UPDATE. Ela compara a
// lista de itens antiga com a nova, descobre se alguma OCORRÊNCIA foi
// adicionada e, se sim, envia uma notificação push para todos os aparelhos
// inscritos na tabela `push_inscricoes` — inclusive com o app fechado.
//
// Configuração necessária (ver NOTIFICACOES_PUSH.md na raiz do projeto):
//   1. supabase secrets set VAPID_PUBLIC_KEY=...
//   2. supabase secrets set VAPID_PRIVATE_KEY=...
//   3. supabase secrets set VAPID_SUBJECT=mailto:seuemail@empresa.com
//   4. supabase functions deploy notificar-ocorrencia
//   5. Criar um Database Webhook (Dashboard → Database → Webhooks) para
//      INSERT/UPDATE em relatorios_abertos, apontando para esta função.

import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT')     ?? 'mailto:contato@example.com'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

function ehOcorrencia(item: any) {
  return !!item && (item.tipo === 'ocorrencia' || item.tipo === 'occ')
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

// Retorna o conjunto de ids de usuários que desativaram notificações no Admin
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

  const registroNovo   = payload.record ?? {}
  const registroAntigo = payload.old_record ?? {}

  const itensAntigos = Array.isArray(registroAntigo.itens) ? registroAntigo.itens : []
  const itensNovos   = Array.isArray(registroNovo.itens)   ? registroNovo.itens   : []

  // Itens que existem agora mas não existiam antes = itens recém-adicionados
  const itensAdicionados = itensNovos.slice(itensAntigos.length)
  const novasOcorrencias = itensAdicionados.filter(ehOcorrencia)

  if (novasOcorrencias.length === 0) {
    return new Response('sem novas ocorrências', { status: 200 })
  }

  const todasInscricoes = await buscarInscricoes()
  const idsDesativados = await buscarUsuariosComNotificacaoDesativada()

  // Só remove da lista quem TEM usuario_id vinculado e está desativado no
  // Admin. Inscrições antigas sem usuario_id (feitas antes dessa função
  // existir) continuam recebendo normalmente.
  const inscricoes = todasInscricoes.filter(
    (i: any) => !i.usuario_id || !idsDesativados.has(String(i.usuario_id))
  )

  if (inscricoes.length === 0) {
    return new Response('nenhum aparelho inscrito (ou todos desativados)', { status: 200 })
  }

  const setor = registroNovo.setor || 'Setor'
  const turno = registroNovo.turno || 'turno'

  const resultados: any[] = []

  for (const ocorrencia of novasOcorrencias) {
    const titulo = `🔧 Nova ocorrência — ${setor}`
    const corpo = [ocorrencia.equipamento, ocorrencia.sintoma]
      .filter(Boolean)
      .join(': ') || `Ocorrência registrada no turno da ${turno}`

    const dadosNotificacao = JSON.stringify({
      titulo,
      corpo,
      url: '/',
      tag: `relatorio-${registroNovo.id}`,
    })

    for (const inscricao of inscricoes) {
      const assinatura = {
        endpoint: inscricao.endpoint,
        keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
      }
      try {
        await webpush.sendNotification(assinatura, dadosNotificacao)
        resultados.push({ endpoint: inscricao.endpoint, ok: true })
      } catch (erro: any) {
        // 404/410 = inscrição expirada ou o usuário desinstalou o app
        if (erro?.statusCode === 404 || erro?.statusCode === 410) {
          await removerInscricao(inscricao.endpoint)
        }
        resultados.push({
          endpoint: inscricao.endpoint,
          ok: false,
          statusCode: erro?.statusCode ?? null,
          corpoResposta: erro?.body ?? null,
          erro: String(erro),
        })
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, enviados: resultados.length, resultados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
