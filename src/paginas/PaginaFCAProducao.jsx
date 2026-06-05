// Tela de FCA para o grupo Produção
// Visualização dos FCAs com opção de aprovar ou reprovar cada um

import { useFCAs } from '../ganchos/useFCAs'
import CardFCA from '../componentes/CardFCA'

export default function PaginaFCAProducao({ sessao, mostrarAviso }) {
  const autor = sessao?.login || sessao?.nome || 'Produção'
  const { fcas, carregando, validar } = useFCAs(!!sessao)

  async function handleValidar(id, tipo, quem) {
    await validar(id, tipo, quem)
    mostrarAviso(tipo === 'aprovado' ? '✅ FCA aprovado!' : '❌ FCA reprovado.')
  }

  return (
    <div className="pagina">
      <div className="container">

        {/* Aviso de modo somente leitura */}
        <div className="aviso-producao">
          <span>📋</span>
          <span>FCAs disponíveis para validação — aprovação ou reprovação por setor.</span>
        </div>

        {carregando && (
          <p className="texto-apagado" style={{ textAlign: 'center', padding: 16 }}>
            Carregando FCAs...
          </p>
        )}

        {!carregando && fcas.length === 0 && (
          <div className="vazio">
            <div className="vazio-icone">📋</div>
            <p>Nenhum FCA disponível no momento.</p>
          </div>
        )}

        {fcas.map(fca => (
          <CardFCA
            key={fca.id}
            fca={fca}
            podeEditar={false}
            podeValidar={true}
            aoValidar={handleValidar}
            autor={autor}
          />
        ))}

      </div>
    </div>
  )
}
