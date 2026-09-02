// ── ocorrência automática ao concluir manutenção ───────────────
// Ao concluir um atendimento na área de manutenção da Ronda, este módulo
// cria (ou reaproveita) o relatório aberto do Passagem de Turno para o
// setor/turno/dia correspondente, e insere nele um item de OCORRÊNCIA já
// rascunhado com o que a Ronda sabe (equipamento, quem atendeu, o que foi
// relatado como problema) — os campos que só o manutentor sabe (modo de
// falha, impacto, solução, horários exatos etc.) ficam em branco, para
// serem preenchidos por ele depois na aba "Novo" do Passagem de Turno.
//
// Reaproveita a MESMA tabela (`relatorios_abertos`) e o MESMO formato de
// item usado pelo resto do app — por isso o item criado aqui aparece
// normalmente na lista, pode ser editado no painel de Ocorrência, e já
// dispara a notificação "🔧 Nova ocorrência" (o gancho
// useNotificacoesTempoReal observa a mesma tabela).

import { bd, TABELA_ABERTOS, TABELA_FCAS } from '../utilitarios/supabase.js'

// Estimativa de turno pelo horário — ajuste aqui se os turnos reais da
// fábrica tiverem outros horários de corte.
function turnoPeloHorario(agora = new Date()) {
  const h = agora.getHours()
  if (h >= 6 && h < 14)  return 'Manhã'
  if (h >= 14 && h < 22) return 'Tarde'
  if (h >= 22 || h < 0)  return 'Noite'
  return 'Turno 0'
}

// Gera o FCA vinculado a uma ocorrência recém-criada — mesma lógica usada em
// PainelItem.jsx quando a ocorrência é lançada manualmente pela aba "Novo".
// Aqui é chamado a partir do fluxo da Ronda/Manutenção, que insere a
// ocorrência direto no banco (sem passar pelo painel), então precisa gerar
// o FCA por conta própria.
async function gerarFcaAutomatico({ relatorioId, indice, setor, turno, data, item }) {
  try {
    const { error } = await bd.from(TABELA_FCAS).insert({
      equipamento: item.equipamento,
      fato: item.sintoma || '',
      causas: [], acoes_verificacao: [], acao_corretiva: [], acoes_futuras: [],
      resultado: '',
      criado_por: item.executor || 'Ronda',
      criado_em: Date.now(),
      gerado_automaticamente: true,
      preenchido: false, // aguardando preenchimento pela manutenção
      ocorrencia_origem: {
        relatorio_id: relatorioId,
        indice,
        setor, turno, data,
        ...item,
      },
    })
    if (error) console.warn('Não foi possível gerar o FCA automático:', error.message)
  } catch (e) {
    console.warn('Não foi possível gerar o FCA automático:', e.message)
  }
}

// atendimento: linha de `ronda_atendimentos_manutencao` já finalizada
// contexto: { setorNome, maquinaNome, estacaoNome }
export async function criarOcorrenciaAutomatica(atendimento, contexto) {
  const agora = new Date()
  const data  = agora.toISOString().split('T')[0]
  const turno = turnoPeloHorario(agora)
  const setor = contexto.setorNome || '—'

  const equipamento = [contexto.maquinaNome, contexto.estacaoNome].filter(Boolean).join(' — ')

  // Se o manutentor já preencheu os horários manualmente no início do
  // atendimento (tela "Manutenção" → "Sinalizar atendimento"), esses
  // valores vêm prontos aqui e pré-selecionam os mesmos campos na
  // ocorrência — economizando esse preenchimento depois. Se nada foi
  // informado, os campos ficam EM BRANCO (não usamos mais o horário real
  // de início/conclusão do atendimento como valor padrão — quem preenche
  // a ocorrência é quem deve informar o horário real do atendimento).
  const horarioInicio = atendimento.horario_inicio_manual || ''
  const horarioFim    = atendimento.horario_fim_manual || ''

  // Mesmo cálculo de duração usado no formulário de Ocorrência, pra já
  // vir preenchido quando os dois horários (início e fim) são conhecidos.
  let duracaoH = '', duracaoM = ''
  if (horarioInicio && horarioFim) {
    const [hi, mi] = horarioInicio.split(':').map(Number)
    const [hf, mf] = horarioFim.split(':').map(Number)
    let total = (hf * 60 + mf) - (hi * 60 + mi)
    if (total < 0) total += 24 * 60
    duracaoH = Math.floor(total / 60)
    duracaoM = total % 60
  }

  const item = {
    tipo: 'ocorrencia',
    equipamento,
    sintoma: atendimento.descricao || '',
    modo: atendimento.modo_falha || '',
    impacto: '',
    intervencao: '',
    horario_inicio: horarioInicio,
    horario_fim: horarioFim,
    duracao_h: duracaoH, duracao_m: duracaoM,
    solucao: '',
    executor: atendimento.executor || atendimento.manutentor_nome || '',
    // marcador interno — não usado em nenhum outro lugar do app, só serve
    // para diferenciar visualmente/auditar que este item veio da Ronda
    origem: 'ronda',
    criado_em: agora.getTime(),
  }

  try {
    // 1) tenta reaproveitar um relatório aberto já existente para
    //    setor + turno + data (mesma regra usada em PaginaNovo.jsx)
    const { data: existente } = await bd
      .from(TABELA_ABERTOS)
      .select('id, itens')
      .eq('setor', setor).eq('turno', turno).eq('data', data)
      .maybeSingle()

    if (existente) {
      const itens = [...(existente.itens || []), item]
      const { error } = await bd.from(TABELA_ABERTOS)
        .update({ itens, updated_at: Date.now() })
        .eq('id', existente.id)
      if (error) throw error
      // Toda ocorrência gera um FCA a ser preenchido — mesmo vindo da Ronda
      await gerarFcaAutomatico({
        relatorioId: existente.id, indice: itens.length - 1,
        setor, turno, data, item,
      })
      return
    }

    // 2) senão, cria um relatório novo já com o item dentro
    const { data: novoRelatorio, error } = await bd.from(TABELA_ABERTOS).insert({
      setor, data, turno,
      titulo: 'Passagem de Turno',
      itens: [item],
      criado_em: Date.now(),
      criado_por: atendimento.manutentor_nome || 'Ronda',
      tecnico: atendimento.manutentor_nome || 'Ronda',
      responsavel: '',
    }).select().single()
    // 23505 = restrição única (setor+turno+data) — alguém criou ao mesmo
    // tempo; tenta de novo lendo o registro que já existe.
    if (error?.code === '23505') {
      const { data: jaExiste } = await bd.from(TABELA_ABERTOS)
        .select('id, itens').eq('setor', setor).eq('turno', turno).eq('data', data).maybeSingle()
      if (jaExiste) {
        const itensAtualizados = [...(jaExiste.itens || []), item]
        await bd.from(TABELA_ABERTOS)
          .update({ itens: itensAtualizados, updated_at: Date.now() })
          .eq('id', jaExiste.id)
        await gerarFcaAutomatico({
          relatorioId: jaExiste.id, indice: itensAtualizados.length - 1,
          setor, turno, data, item,
        })
      }
      return
    }
    if (error) throw error
    // Relatório novo — o item criado é sempre o índice 0
    await gerarFcaAutomatico({
      relatorioId: novoRelatorio.id, indice: 0,
      setor, turno, data, item,
    })
  } catch (e) {
    // Não deixa o encerramento do atendimento falhar por causa disso —
    // só avisa no console para investigação.
    console.warn('Não foi possível criar a ocorrência automática:', e.message)
  }
}
