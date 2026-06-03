// Painel que sobe da parte de baixo da tela para adicionar ou editar um item
// Chamado de "bottom sheet" — padrão mobile muito usado em apps

import { useState, useRef } from 'react'
import { bd, TABELA_ABERTOS, BUCKET_FOTOS } from '../utilitarios/supabase'
import FormOcorrencia from './FormOcorrencia'
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
  aoSalvar,
  aoFechar,
  mostrarAviso,
}) {
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const [fotos, setFotos] = useState([]) // array de {file, dataUrl, url, path}
  const [salvando, setSalvando] = useState(false)

  // Preenche o formulário quando abre para editar um item existente
  // useRef para não re-executar toda vez que renderiza
  const inicializado = useRef(false)
  if (aberto && !inicializado.current) {
    inicializado.current = true
    if (itemEditando) {
      // Edição: carrega os dados do item
      setFormulario({ ...FORMULARIO_VAZIO, ...itemEditando })
      setFotos(
        (itemEditando.fotos || []).map(f => ({
          url: f.url,
          path: f.path,
          dataUrl: f.url,
          file: null,
        }))
      )
    } else {
      // Novo item: limpa tudo
      setFormulario({ ...FORMULARIO_VAZIO, tipo })
      setFotos([])
    }
  }

  // Quando o painel fecha, reseta o flag para a próxima abertura
  function fechar() {
    inicializado.current = false
    aoFechar()
  }

  // Adiciona novas fotos à lista
  function adicionarFotos(arquivos) {
    arquivos.forEach(arquivo => {
      const leitor = new FileReader()
      leitor.onload = e => {
        // dataUrl é a versão base64 da imagem — usada para preview imediato
        setFotos(f => [...f, { file: arquivo, dataUrl: e.target.result, url: null, path: null }])
      }
      leitor.readAsDataURL(arquivo)
    })
  }

  // Remove uma foto da lista pelo índice
  function removerFoto(indice) {
    setFotos(f => f.filter((_, i) => i !== indice))
  }

  // Envia as fotos novas para o Supabase Storage e retorna lista de {url, path}
  async function enviarFotos() {
    const enviadas = []

    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i]

      // Foto já enviada anteriormente — reutiliza sem fazer upload de novo
      if (foto.url && foto.path) {
        enviadas.push({ url: foto.url, path: foto.path })
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
      enviadas.push({ url: data.publicUrl, path: caminho })
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

      // 3) Busca os itens atuais do relatório para não perder os outros
      const { data: atual } = await bd
        .from(TABELA_ABERTOS)
        .select('itens')
        .eq('id', idRelatorio)
        .single()
      const listaItens = [...(atual?.itens || [])]

      if (indiceEditando !== null) {
        // Edição: preserva o autor original
        item.autor = listaItens[indiceEditando]?.autor || nomeusuario
        listaItens[indiceEditando] = item // substitui o item
      } else {
        listaItens.push(item) // adiciona ao final
      }

      // 4) Salva a lista atualizada no banco
      const { error } = await bd
        .from(TABELA_ABERTOS)
        .update({ itens: listaItens, updated_at: Date.now() })
        .eq('id', idRelatorio)

      if (error) throw error

      mostrarAviso(indiceEditando !== null ? '✓ Item atualizado!' : '✓ Item salvo!')
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

  const ehOcorrencia = tipo === 'ocorrencia' || tipo === 'occ'

  return (
    // Fundo escuro — clique nele fecha o painel
    <div className="fundo-painel" onClick={e => e.target === e.currentTarget && fechar()}>
      <div className="painel-item">
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

        {/* Conteúdo com scroll */}
        <div className="painel-conteudo">
          {ehOcorrencia ? (
            <FormOcorrencia formulario={formulario} aoMudar={setFormulario} />
          ) : (
            <FormAtividade formulario={formulario} aoMudar={setFormulario} />
          )}
          <div className="divisor" />
          <UploadFotos fotos={fotos} aoAdicionar={adicionarFotos} aoRemover={removerFoto} />
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
