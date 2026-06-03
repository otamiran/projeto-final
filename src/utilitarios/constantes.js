// Opções do campo "Modo de Falha" em ocorrências
export const MODOS_FALHA = ['Elétrico', 'Mecânico', 'Instrumental', 'Processo', 'Outro']

// Opções do campo "Impacto" em ocorrências
export const IMPACTOS = ['Parada total', 'Redução de capacidade', 'Sem impacto']

// Opções do campo "Tipo de Intervenção" em ocorrências
export const TIPOS_INTERVENCAO = ['Corretiva', 'Paliativa', 'Preventiva', 'Substituição']

// Opções do campo "Status" em atividades
export const STATUS_ATIVIDADE = ['Concluída', 'Em andamento', 'Pendente']

// Emoji para cada status — usado na mensagem de texto
export const EMOJI_STATUS = {
  Concluída: '✅',
  'Em andamento': '🔄',
  Pendente: '⏳',
}

// Classe CSS para colorir os botões de status
export const COR_STATUS = {
  Concluída: 'verde',
  'Em andamento': 'azul',
  Pendente: 'vermelho',
}

// Usuários do sistema
// ⚠️ Para produção real: use Supabase Auth com e-mail/senha
export const USUARIOS = [
  {
    login: 'manutencao', // nome digitado na tela de login
    senha: 'turno123', // senha (em produção real, nunca deixe aqui)
    nome: 'Manutenção', // nome exibido no app
    perfil: 'usuario', // 'usuario' = pode criar/editar apenas seus itens
  },
  {
    login: 'admin',
    senha: 'admin999',
    nome: 'Administrador',
    perfil: 'admin', // 'admin' = pode excluir qualquer coisa
  },
]

// Chave para salvar a sessão no navegador (localStorage)
export const CHAVE_SESSAO = 'turno_sessao'

// Nomes das tabelas do módulo Almoxarifado no Supabase
export const TABELA_LISTA  = 'almoxarifado_lista'
export const TABELA_OBS    = 'almoxarifado_descs'

// Senha do modo administrador (troque aqui quando precisar)
export const SENHA_ADMIN   = 'Alpa'

// Chave do loca     lStorage para persistir a sessão admin
export const CHAVE_ADMIN   = 'almox-admin-auth'

// Quantidade de linhas por requisição ao Supabase (paginação)
export const PAGINA        = 1000

// Quantidade de linhas por lote no insert em massa (importação)
export const LOTE           = 500