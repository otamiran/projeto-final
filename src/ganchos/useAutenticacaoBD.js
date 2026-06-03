// Gancho de autenticação com banco de dados
// Substitui useAutenticacao.js (que usava lista fixa)

import { useState } from 'react'
import { fazerLoginBD, fazerLogoutBD, lerSessaoBD } from '../utilitarios/autenticacaoBD'

export function useAutenticacaoBD() {
  // Carrega sessão salva ao iniciar (mantém login após recarregar a página)
  const [sessao, setSessao] = useState(() => lerSessaoBD())
  const [carregando, setCarregando] = useState(false)

  // Faz login assíncrono via banco
  async function entrar(login, senha) {
    setCarregando(true)
    const resultado = await fazerLoginBD(login, senha)
    if (resultado.ok) {
      // Adiciona campos extras à sessão (preenchidos depois na tela principal)
      const sessaoCompleta = {
        ...resultado.sessao,
        tecnico: '',
        responsavel: '',
      }
      try { localStorage.setItem('turno_sessao', JSON.stringify(sessaoCompleta)) } catch {}
      setSessao(sessaoCompleta)
    }
    setCarregando(false)
    return resultado
  }

  // Atualiza nome do técnico e responsável sem sair do sistema
  function atualizarIdentificacao(tecnico, responsavel) {
    setSessao(s => {
      const nova = { ...s, tecnico, responsavel }
      try { localStorage.setItem('turno_sessao', JSON.stringify(nova)) } catch {}
      return nova
    })
  }

  // Faz logout
  function sair() {
    fazerLogoutBD()
    setSessao(null)
  }

  return {
    sessao,
    estaLogado: !!sessao,
    carregando,    // true enquanto aguarda o banco durante o login
    entrar,
    sair,
    atualizarIdentificacao,
    // Atalhos de grupo para facilitar condicionais nos componentes
    ehManutencao: sessao?.grupo === 'manutencao',
    ehProducao:   sessao?.grupo === 'producao',
    ehAdmin:      sessao?.grupo === 'admin',
  }
}
