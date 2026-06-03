import { createClient } from '@supabase/supabase-js'

// Endereço do projeto no Supabase (Settings > API > URL)
const URL_PROJETO = 'https://tdpgaqiktinngiuptatq.supabase.co'

// Chave pública anônima (segura para usar no front-end)
const CHAVE_PUBLICA =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhYndrb3h2YWt5dHlhY2xpaG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTU3OTIsImV4cCI6MjA5NTU3MTc5Mn0.utGP2Qem_zN_pX6cxaXvnzrxn2s8oEI2oqc7jaVqUkA'

// Cria o cliente — use 'bd' para qualquer consulta
export const bd = createClient(URL_PROJETO, CHAVE_PUBLICA)

// ── Tabelas principais ────────────────────────────────────────────────────────
export const TABELA_ABERTOS    = 'relatorios_abertos' // relatórios em andamento
export const TABELA_HISTORICO  = 'relatorios'          // relatórios fechados
export const BUCKET_FOTOS      = 'fotos'               // pasta de imagens no storage

// ── Tabelas do sistema de usuários e interação da produção ───────────────────
export const TABELA_USUARIOS    = 'usuarios'    // cadastro com grupos
export const TABELA_VALIDACOES  = 'validacoes'  // aprovações/reprovações
export const TABELA_COMENTARIOS = 'comentarios' // comentários por ocorrência
