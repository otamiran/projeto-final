// ── sincronização remota (somente estrutura) ─────────────────
// Este módulo é o único ponto do app que fala com o Supabase.
// Ele NUNCA lê/grava status, obs, usuário ou histórico — só a
// lista/hierarquia de equipamentos: setores, grupos, máquinas
// e estações (nome, ordem, relações de pai/filho).
//
// Status, observação, executante e histórico de rondas continuam
// 100% locais (localStorage), tratados em db.js.

// Reaproveita o MESMO client Supabase do projeto principal (Passagem de
// Turno) — banco único, sem duplicar credenciais/projeto.
import { bd as supabase } from '../utilitarios/supabase.js'

const TABELAS_ESTRUTURA = ['setores', 'grupos', 'maquinas', 'estacoes']

// Nome lógico (usado internamente no app, no localStorage e nas props dos
// componentes) → nome físico da tabela no Supabase. Prefixo "ronda_" evita
// colidir com a tabela "setores" que já existe no banco do Passagem de
// Turno (schema diferente, sem relação com este módulo).
const TABELA_FISICA = {
  setores:  'ronda_setores',
  grupos:   'ronda_grupos',
  maquinas: 'ronda_maquinas',
  estacoes: 'ronda_estacoes',
}

// campos que de fato pertencem à estrutura em cada tabela —
// qualquer outro campo (status, obs, usuario, atualizado_em)
// nunca é enviado nem sobrescrito no banco.
const CAMPOS_ESTRUTURA = {
  setores:  ['nome', 'ordem'],
  grupos:   ['setor_id', 'nome', 'ordem'],
  maquinas: ['setor_id', 'grupo_id', 'nome', 'ordem'],
  estacoes: ['maquina_id', 'nome'],
}

function somenteEstrutura(tabela, obj) {
  const limpo = {}
  CAMPOS_ESTRUTURA[tabela].forEach(campo => {
    if (obj[campo] !== undefined) limpo[campo] = obj[campo]
  })
  return limpo
}

// ── buscar toda a estrutura (chamado sempre que o app carrega) ─
export async function buscarEstruturaRemota() {
  const resultado = {}
  for (const tabela of TABELAS_ESTRUTURA) {
    const { data, error } = await supabase.from(TABELA_FISICA[tabela]).select('id, ' + [...CAMPOS_ESTRUTURA[tabela], 'criado_em'].join(', '))
    if (error) throw new Error(`${tabela}: ${error.message}`)
    resultado[tabela] = data || []
  }
  return resultado
}

// ── criar (chamado ao adicionar setor/grupo/máquina/estação) ──
export async function criarRemoto(tabela, obj) {
  const linha = somenteEstrutura(tabela, obj)
  const { data, error } = await supabase.from(TABELA_FISICA[tabela]).insert(linha).select().single()
  if (error) throw new Error(`Não foi possível salvar em ${tabela} no banco: ${error.message}`)
  return data
}

// ── atualizar (renomear, mudar ordem, mover de grupo) ─────────
export async function atualizarRemoto(tabela, id, patch) {
  const linha = somenteEstrutura(tabela, patch)
  const { error } = await supabase.from(TABELA_FISICA[tabela]).update(linha).eq('id', id)
  if (error) throw new Error(`Não foi possível atualizar ${tabela} no banco: ${error.message}`)
}

// ── excluir ────────────────────────────────────────────────────
export async function excluirRemoto(tabela, id) {
  const { error } = await supabase.from(TABELA_FISICA[tabela]).delete().eq('id', id)
  if (error) throw new Error(`Não foi possível excluir em ${tabela} no banco: ${error.message}`)
}
