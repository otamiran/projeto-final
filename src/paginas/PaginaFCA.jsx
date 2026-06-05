// Tela de FCA para manutenção e admin
// Lista todos os FCAs + botão para criar novo + edição inline

import { useState } from 'react'
import { useFCAs } from '../ganchos/useFCAs'
import FormFCA from '../componentes/FormFCA'
import CardFCA from '../componentes/CardFCA'

export default function PaginaFCA({ sessao, pedir, mostrarAviso }) {
  const autor = sessao?.login || sessao?.nome || '—'
  const { fcas, carregando, criar, atualizar, excluir } = useFCAs(!!sessao)

  const [criando, setCriando]         = useState(false)  // mostra form de criação
  const [editando, setEditando]       = useState(null)   // fca sendo editado
  const [salvando, setSalvando]       = useState(false)

  // Salva novo FCA
  async function handleCriar(dados) {
    setSalvando(true)
    const res = await criar(dados, autor)
    setSalvando(false)
    if (!res.ok) { mostrarAviso('Erro ao salvar: ' + res.erro, true); return }
    setCriando(false)
    mostrarAviso('✓ FCA salvo!')
  }

  // Atualiza FCA existente
  async function handleAtualizar(dados) {
    setSalvando(true)
    const res = await atualizar(editando.id, dados)
    setSalvando(false)
    if (!res.ok) { mostrarAviso('Erro ao atualizar: ' + res.erro, true); return }
    setEditando(null)
    mostrarAviso('✓ FCA atualizado!')
  }

  // Exclui com confirmação
  function handleExcluir(id) {
    pedir('Excluir este FCA permanentemente?', async () => {
      await excluir(id)
      mostrarAviso('FCA excluído.')
    })
  }

  return (
    <div className="pagina">
      <div className="container">

        {/* Botão novo FCA */}
        {!criando && !editando && (
          <button
            className="botao botao-destaque largura-total"
            onClick={() => setCriando(true)}
          >
            + Novo FCA
          </button>
        )}

        {/* Formulário de criação */}
        {criando && (
          <div className="card">
            <div className="card-cabecalho">
              <span className="card-rotulo">Novo FCA</span>
            </div>
            <div className="card-corpo">
              <FormFCA
                aoSalvar={handleCriar}
                aoFechar={() => setCriando(false)}
                salvando={salvando}
              />
            </div>
          </div>
        )}

        {/* Formulário de edição */}
        {editando && (
          <div className="card">
            <div className="card-cabecalho">
              <span className="card-rotulo">Editando FCA — {editando.equipamento}</span>
            </div>
            <div className="card-corpo">
              <FormFCA
                inicial={editando}
                aoSalvar={handleAtualizar}
                aoFechar={() => setEditando(null)}
                salvando={salvando}
              />
            </div>
          </div>
        )}

        {/* Lista de FCAs */}
        {carregando && (
          <p className="texto-apagado" style={{ textAlign: 'center', padding: 16 }}>
            Carregando FCAs...
          </p>
        )}

        {!carregando && fcas.length === 0 && !criando && (
          <div className="vazio">
            <div className="vazio-icone">📋</div>
            <p>Nenhum FCA registrado ainda.</p>
          </div>
        )}

        {fcas.map(fca => (
          <CardFCA
            key={fca.id}
            fca={fca}
            podeEditar={true}
            podeValidar={false}
            aoEditar={setEditando}
            aoExcluir={handleExcluir}
          />
        ))}

      </div>
    </div>
  )
}
