// Tela de login com abas: Entrar / Cadastrar
// Após o login, o App.jsx detecta o grupo e redireciona automaticamente

import { useState } from 'react'
import { solicitarCadastro } from '../utilitarios/autenticacaoBD'

export default function PaginaLogin({ aoEntrar, carregando }) {
  // Aba ativa: 'entrar' | 'cadastrar'
  const [aba, setAba] = useState('entrar')

  // Campos de login
  const [login, setLogin]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')

  // Campos de cadastro
  const [novoLogin, setNovoLogin]   = useState('')
  const [novaSenha, setNovaSenha]   = useState('')
  const [confirma, setConfirma]     = useState('')
  const [grupo, setGrupo]           = useState('manutencao')
  const [erroCad, setErroCad]       = useState('')
  const [okCad, setOkCad]           = useState(false)
  const [cadastrando, setCadastrando] = useState(false)

  // Tenta entrar — chama a função async do App
  async function tentarEntrar() {
    setErro('')
    const resultado = await aoEntrar(login, senha)
    if (!resultado.ok) {
      setErro(resultado.erro)
      setSenha('')
    }
  }

  // Solicita cadastro de novo usuário
  async function tentarCadastrar() {
    setErroCad('')
    setOkCad(false)
    if (!novoLogin.trim() || !novaSenha.trim()) { setErroCad('Preencha todos os campos.'); return }
    if (novaSenha !== confirma) { setErroCad('As senhas não coincidem.'); return }
    if (novaSenha.length < 4)  { setErroCad('Senha: mínimo 4 caracteres.'); return }
    setCadastrando(true)
    const res = await solicitarCadastro(novoLogin, novaSenha, grupo)
    setCadastrando(false)
    if (!res.ok) { setErroCad(res.erro); return }
    // Limpa os campos e mostra mensagem de sucesso
    setNovoLogin(''); setNovaSenha(''); setConfirma('')
    setOkCad(true)
  }

  return (
    <div className="pagina-login">
      {/* ── Logo ── */}
      <div className="logo-login">
        <div className="hexagono" />
        <span className="nome-app">PASSAGEM DE TURNO</span>
      </div>

      {/* ── Card central ── */}
      <div className="card-login">
        {/* Abas Entrar / Cadastrar */}
        <div className="abas-login">
          <button
            className={`aba-login ${aba === 'entrar' ? 'ativa' : ''}`}
            onClick={() => { setAba('entrar'); setErro('') }}
          >
            Entrar
          </button>
          <button
            className={`aba-login ${aba === 'cadastrar' ? 'ativa' : ''}`}
            onClick={() => { setAba('cadastrar'); setErroCad(''); setOkCad(false) }}
          >
            Cadastrar
          </button>
        </div>

        {/* ── Aba: Entrar ── */}
        {aba === 'entrar' && (
          <>
            <p className="subtitulo-login">Sistema de Manutenção Industrial</p>
            {erro && <div className="erro-login">{erro}</div>}

            <div className="campo">
              <label>Usuário</label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Seu nome de usuário"
                autoComplete="username"
              />
            </div>
            <div className="campo">
              <label>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && tentarEntrar()}
              />
            </div>
            <button
              className="botao botao-destaque largura-total"
              onClick={tentarEntrar}
              disabled={carregando}
            >
              {carregando ? 'Verificando...' : '→ Entrar'}
            </button>
          </>
        )}

        {/* ── Aba: Cadastrar ── */}
        {aba === 'cadastrar' && (
          <>
            <p className="subtitulo-login">Solicite acesso — o admin aprovará seu cadastro</p>

            {erroCad && <div className="erro-login">{erroCad}</div>}
            {okCad && (
              <div className="ok-login">
                ✓ Solicitação enviada! Aguarde a aprovação do administrador.
              </div>
            )}

            <div className="campo">
              <label>Usuário</label>
              <input
                type="text"
                value={novoLogin}
                onChange={e => setNovoLogin(e.target.value)}
                placeholder="Escolha um nome de usuário"
              />
            </div>
            <div className="campo">
              <label>Senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 4 caracteres"
              />
            </div>
            <div className="campo">
              <label>Confirmar senha</label>
              <input
                type="password"
                value={confirma}
                onChange={e => setConfirma(e.target.value)}
                placeholder="Repita a senha"
                onKeyDown={e => e.key === 'Enter' && tentarCadastrar()}
              />
            </div>

            {/* Seleção de grupo — define o que o usuário pode fazer */}
            <div className="campo">
              <label>Meu setor</label>
              <div className="grupo-botoes">
                <button
                  className={`botao-grupo ${grupo === 'manutencao' ? 'ativo' : ''}`}
                  onClick={() => setGrupo('manutencao')}
                >
                  🔧 Manutenção
                </button>
                <button
                  className={`botao-grupo ${grupo === 'producao' ? 'ativo' : ''}`}
                  onClick={() => setGrupo('producao')}
                >
                  🏭 Produção
                </button>
              </div>
            </div>

            <button
              className="botao botao-destaque largura-total"
              onClick={tentarCadastrar}
              disabled={cadastrando}
            >
              {cadastrando ? 'Enviando...' : '→ Solicitar Acesso'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
