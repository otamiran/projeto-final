// Identifica ocorrências que foram criadas automaticamente a partir de um
// atendimento da Ronda (ver ronda/ocorrenciaAutomatica.js — marca `origem:
// 'ronda'` no item) e que ainda estão pendentes de preenchimento pelo
// manutentor: campos que só ele sabe (modo de falha, impacto, intervenção,
// solução) e a informação de duração (horário de início/fim OU tempo
// estimado de atendimento) continuam em branco.

export function ehOcorrenciaGeradaDeAtendimento(item) {
  return !!item && item.origem === 'ronda'
}

export function faltaInformacaoDeDuracao(item) {
  const temHorario = !!(item.horario_inicio || item.horario_fim)
  const temTempoEstimado = !!(item.tempo_estimado_h || item.tempo_estimado_m)
  return !temHorario && !temTempoEstimado
}

export function ocorrenciaPendenteDePreenchimento(item) {
  if (!ehOcorrenciaGeradaDeAtendimento(item)) return false
  return (
    !item.modo ||
    !item.impacto ||
    !item.intervencao ||
    !item.solucao ||
    faltaInformacaoDeDuracao(item)
  )
}
