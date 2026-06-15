import { createClient } from '@supabase/supabase-js'

const URL_PROJETO   = 'https://tdpgaqiktinngiuptatq.supabase.co'
const CHAVE_PUBLICA = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcGdhcWlrdGlubmdpdXB0YXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjUwNjAsImV4cCI6MjA5NDEwMTA2MH0.a76Kgj9Flj6NkasYETC5BXMoIhXMBoCUM-w2BqJBlS4'

export const bd = createClient(URL_PROJETO, CHAVE_PUBLICA)

// ── Tabelas principais ────────────────────────────────────────────────────────
export const TABELA_ABERTOS     = 'relatorios_abertos'
export const TABELA_HISTORICO   = 'relatorios'
export const BUCKET_FOTOS       = 'fotos'

// ── Usuários e interação da produção ─────────────────────────────────────────
export const TABELA_USUARIOS    = 'usuarios'
export const TABELA_VALIDACOES  = 'validacoes'
export const TABELA_COMENTARIOS = 'comentarios'

// ── FCA ───────────────────────────────────────────────────────────────────────
export const TABELA_FCAS        = 'fcas'

// ── Setores permanentes ─────────────────────────────────────────────────────
export const TABELA_SETORES     = 'setores'
