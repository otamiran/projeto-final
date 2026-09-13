// Painel que sobe da parte de baixo da tela para adicionar ou editar um item
// Chamado de "bottom sheet" — padrão mobile muito usado em apps

import { useState, useLayoutEffect, useRef, useEffect, useCallback } from 'react'
import { bd, TABELA_ABERTOS, TABELA_FCAS, BUCKET_FOTOS } from '../utilitarios/supabase'
import FormOcorrencia, { SECOES_OCORRENCIA } from './FormOcorrencia'
import FormAtividade from './FormAtividade'
import UploadFotos from './UploadFotos'

// Formulário vazio — valores padrão ao abrir para novo item
const FORMULARIO_VAZIO = {
  tipo: '',
  equipamento: '',
  sintoma: '',
  modo: null,
  impacto: null,
  intervencao: null,
  horario_inicio: '',  // horário de início
  horario_fim: '',     // horário de fim
  duracao_h: '',       // horas calculadas automaticamente
  duracao_m: '',       // minutos calculados automaticamente
  executor: '',        // nome do executor (editável após preenchimento)
  solucao: '',
  descricao: '',
  status: null,
}

export default function PainelItem({
  aberto,
  tipo,
  itemEditando,
  indiceEditando,
  idRelatorio,
  nomeusuario,
  equipamentos = [],
  aoSalvar,
  aoFechar,
  mostrarAviso,
}) {
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [fotos, setFotos] = useState([]) // array de {file, dataUrl, url, path}
  const [salvando, setSalvando] = useState(false)

  // ── barra lateral de navegação (só na Ocorrência, cujas descrições
  // costumam ser bem mais longas do que as da Atividade) ──────────────
  const refConteudo = useRef(null)
  const [secaoAtiva, setSecaoAtiva] = useState('')

  // Preenche o formulário quando o painel abre (edição carrega os dados do item,
  // item novo começa em branco). useLayoutEffect roda antes do navegador pintar a
  // tela, então o usuário nunca vê o formulário em branco piscar ao abrir uma
  // ocorrência já preenchida — e reage sempre que o item sendo editado muda.
  useLayoutEffect(() => {
    if (!aberto) return

    if (itemEditando) {
      // Edição: carrega os dados do item
      setFormulario({ ...FORMULARIO_VAZIO, ...itemEditando })
      setFotos(
        (itemEditando.fotos || []).map(f => ({
          url: f.url,
          path: f.path,
          dataUrl: f.url,
          file: null,
          legenda: f.legenda || '',
        }))
      )
    } else {
      // Novo item: limpa tudo
      setFormulario({ ...FORMULARIO_VAZIO, tipo })
      setFotos([])
    }
  }, [aberto, itemEditando, indiceEditando, tipo])

  const ehOcorrencia = tipo === 'ocorrencia' || tipo === 'occ'

  // Rola o conteúdo do painel até a seção clicada na barra lateral.
  const irParaSecao = useCallback(id => {
    const alvo = refConteudo.current?.querySelector(`#${id}`)
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Observa qual seção está visível no topo da área de scroll para
  // destacar o item correspondente na barra lateral (scrollspy simples).
  useEffect(() => {
    if (!aberto || !ehOcorrencia) return
    const container = refConteudo.current
    if (!container) return

    const elementos = SECOES_OCORRENCIA
      .map(s => container.querySelector(`#${s.id}`))
      .filter(Boolean)
    if (elementos.length === 0) return

    const observador = new IntersectionObserver(
      entradas => {
        const visiveis = entradas.filter(en => en.isIntersecting)
        if (visiveis.length === 0) return
        // entre as visíveis, usa a mais próxima do topo do painel
        const maisProxima = visiveis.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        )
        setSecaoAtiva(maisProxima.target.id)
      },
      { root: container, rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    elementos.forEach(el => observador.observe(el))
    setSecaoAtiva(elementos[0].id)
    return () => observador.disconnect()
  }, [aberto, ehOcorrencia, itemEditando, tipo])

  function fechar() {
    aoFechar()
  }

  // Adiciona novas fotos à lista
  function adicionarFotos(arquivos) {
    arquivos.forEach(arquivo => {
      const leitor = new FileReader()
      leitor.onload = e => {
        // dataUrl é a versão base64 da imagem — usada para preview imediato
        setFotos(f => [...f, { file: arquivo, dataUrl: e.target.result, url: null, path: null, legenda: '' }])
      }
      leitor.readAsDataURL(arquivo)
    })
  }

  // Remove uma foto da lista pelo índice
  function removerFoto(indice) {
    setFotos(f => f.filter((_, i) => i !== indice))
  }

  // Atualiza a legenda de uma foto pelo índice
  function editarLegenda(indice, texto) {
    setFotos(f => f.map((foto, i) => (i === indice ? { ...foto, legenda: texto } : foto)))
  }

  // Envia as fotos novas para o Supabase Storage e retorna lista de {url, path}
  async function enviarFotos() {
    const enviadas = []

    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i]

      // Foto já enviada anteriormente — reutiliza sem fazer upload de novo
      if (foto.url && foto.path) {
        enviadas.push({ url: foto.url, path: foto.path, legenda: foto.legenda || '' })
        continue
      }

      // Foto nova — faz o upload
      if (!foto.file) continue

      // Caminho único para a foto no storage: pasta/tipo_timestamp_indice
      const caminho = `${idRelatorio}/${tipo}_${Date.now()}_${i}`

      const { error } = await bd.storage
        .from(BUCKET_FOTOS)
        .upload(caminho, foto.file, { upsert: true })
      if (error) continue // pula se der erro no upload

      // Pega a URL pública da foto
      const { data } = bd.storage.from(BUCKET_FOTOS).getPublicUrl(caminho)
      enviadas.push({ url: data.publicUrl, path: caminho, legenda: foto.legenda || '' })
    }

    return enviadas
  }

  // Salva o item no banco
  async function salvar() {
    // Validação mínima
    if (!formulario.equipamento.trim()) {
      mostrarAviso('Informe o equipamento.', true)
      return
    }

    setSalvando(true)

    try {
      // 1) Envia as fotos
      const fotosEnviadas = await enviarFotos()

      // 2) Monta o objeto do item
      const item = {
        ...formulario,
        tipo,
        autor: nomeusuario,
        fotos: fotosEnviadas,
      }

      // 3) Busca os dados atuais do relatório (setor/turno/data + itens) para
      //    não perder os outros itens e para dar contexto ao FCA automático
      const { data: atual } = await bd
        .from(TABELA_ABERTOS)
        .select('itens, setor, turno, data')
        .eq('id', idRelatorio)
        .single()
      const listaItens = [...(atual?.itens || [])]

      let ehItemNovo = indiceEditando === null
      let indiceFinal = indiceEditando

      if (indiceEditando !== null) {
        // Edição: preserva o autor original
        item.autor = listaItens[indiceEditando]?.autor || nomeusuario
        listaItens[indiceEditando] = item // substitui o item
      } else {
        listaItens.push(item) // adiciona ao final
        indiceFinal = listaItens.length - 1
      }

      // 4) Salva a lista atualizada no banco
      const { error } = await bd
        .from(TABELA_ABERTOS)
        .update({ itens: listaItens, updated_at: Date.now() })
        .eq('id', idRelatorio)

      if (error) throw error

      // 5) Toda ocorrência NOVA gera automaticamente um FCA a ser preenchido,
      //    já com um snapshot dos dados da ocorrência (equipamento, sintoma,
      //    setor/turno/data etc.) para exibir lado a lado na tela de FCA —
      //    mesmo que o relatório de origem seja depois fechado/editado.
      let fcaGerado = false
      if (ehOcorrencia && ehItemNovo) {
        try {
          const { error: erroFca } = await bd.from(TABELA_FCAS).insert({
            equipamento: item.equipamento,
            fato: item.sintoma || '',
            causas: [], acoes_verificacao: [], acao_corretiva: [], acoes_futuras: [],
            resultado: '',
            criado_por: nomeusuario,
            criado_em: Date.now(),
            gerado_automaticamente: true,
            preenchido: false, // aguardando preenchimento pela manutenção
            ocorrencia_origem: {
              relatorio_id: idRelatorio,
              indice: indiceFinal,
              setor: atual?.setor || '',
              turno: atual?.turno || '',
              data: atual?.data || '',
              ...item,
            },
          })
          if (!erroFca) fcaGerado = true
          else console.error('Erro ao gerar FCA automático:', erroFca)
        } catch (e) {
          console.error('Erro ao gerar FCA automático:', e)
        }
      }

      mostrarAviso(
        fcaGerado
          ? '✓ Ocorrência salva! Um FCA foi gerado na aba FCA para preenchimento.'
          : indiceEditando !== null ? '✓ Item atualizado!' : '✓ Item salvo!'
      )
      aoSalvar()
      fechar()
    } catch (e) {
      mostrarAviso('Erro ao salvar: ' + e.message, true)
    } finally {
      setSalvando(false)
    }
  }

  // Se o painel não está aberto, não renderiza nada
  if (!aberto) return null

  return (
    // Fundo escuro — clique nele fecha o painel
    <div className="fundo-painel" onClick={e => e.target === e.currentTarget && fechar()}>
      <div className={`painel-item ${ehOcorrencia ? 'painel-item-largo' : ''}`}>
        {/* Cabeçalho colorido */}
        <div className="painel-cabecalho">
          <span
            className={`painel-titulo ${ehOcorrencia ? 'titulo-ocorrencia' : 'titulo-atividade'}`}
          >
            {ehOcorrencia ? '🔧 Ocorrência' : '📅 Atividade'}
          </span>
          <button className="botao-fechar-painel" onClick={fechar}>
            ✕
          </button>
        </div>

        {/* Corpo: barra lateral de navegação (só na Ocorrência) + conteúdo com scroll */}
        <div className={`painel-corpo ${ehOcorrencia ? 'painel-corpo-com-nav' : ''}`}>
          {ehOcorrencia && (
            <nav className="painel-nav-lateral" aria-label="Navegar pelas seções da ocorrência">
              {SECOES_OCORRENCIA.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`painel-nav-item ${secaoAtiva === s.id ? 'ativo' : ''}`}
                  onClick={() => irParaSecao(s.id)}
                >
                  {s.rotulo}
                </button>
              ))}
            </nav>
          )}

          <div className="painel-conteudo" ref={refConteudo}>
            {ehOcorrencia ? (
              <FormOcorrencia formulario={formulario} aoMudar={setFormulario} equipamentos={equipamentos} />
            ) : (
              <FormAtividade formulario={formulario} aoMudar={setFormulario} equipamentos={equipamentos} />
            )}
            <div className="divisor" />
            <div id="secao-fotos">
              <UploadFotos
                fotos={fotos}
                aoAdicionar={adicionarFotos}
                aoRemover={removerFoto}
                aoEditarLegenda={editarLegenda}
              />
            </div>
          </div>
        </div>

        {/* Rodapé fixo com os botões */}
        <div className="painel-rodape">
          <button className="botao" onClick={fechar}>
            Cancelar
          </button>
          <button
            className="botao botao-destaque"
            onClick={salvar}
            disabled={salvando}
            style={{ flex: 2 }}
          >
            {salvando
              ? 'Salvando...'
              : indiceEditando !== null
                ? '✓ Salvar Alterações'
                : '✓ Confirmar e Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
