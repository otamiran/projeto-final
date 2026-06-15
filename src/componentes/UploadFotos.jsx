// Área de upload de fotos e grid de miniaturas

import { useRef } from 'react'

export default function UploadFotos({ fotos, aoAdicionar, aoRemover, aoEditarLegenda }) {
  // Referência para o input oculto de arquivo
  const inputRef = useRef()

  // Quando o usuário seleciona arquivos
  function aoSelecionarArquivos(evento) {
    aoAdicionar([...evento.target.files]) // converte FileList para array
    evento.target.value = '' // limpa para poder selecionar o mesmo arquivo de novo
  }

  return (
    <div>
      <div className="secao-label">📷 Fotos</div>

      {/* Área clicável que abre a câmera/galeria */}
      <div className="area-upload" onClick={() => inputRef.current.click()}>
        <span style={{ fontSize: 32 }}>📷</span>
        <span className="texto-upload">Tirar foto ou escolher da galeria</span>
        <span className="subtexto-upload">Toque para abrir câmera ou galeria</span>
      </div>

      {/* Input oculto — accept="image/*" abre câmera no celular */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={aoSelecionarArquivos}
      />

      {/* Grid de miniaturas — só aparece se tiver fotos */}
      {fotos.length > 0 && (
        <div className="grade-fotos">
          {fotos.map((foto, indice) => (
            <div key={indice} className="miniatura-foto">
              {/* Mostra a imagem em preview */}
              <img src={foto.dataUrl || foto.url} alt={`Foto ${indice + 1}`} />

              {/* Botão X para remover */}
              <button className="botao-remover-foto" onClick={() => aoRemover(indice)}>
                ✕
              </button>

              {/* Badge laranja enquanto a foto ainda não foi enviada */}
              {!foto.url && <div className="badge-aguardando">⏳</div>}

              {/* Campo de legenda — exibida junto da foto no PDF */}
              <input
                type="text"
                className="legenda-foto"
                placeholder={`Legenda da foto ${indice + 1}...`}
                value={foto.legenda || ''}
                onChange={e => aoEditarLegenda?.(indice, e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
