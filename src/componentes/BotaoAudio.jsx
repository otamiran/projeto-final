// Botão de ditado por voz — usa a Web Speech API nativa do navegador
// (funciona em Chrome/Edge no Android e Desktop; no iOS Safari o suporte é
// limitado, então o botão fica desabilitado quando a API não existe).
//
// Ao gravar, o texto reconhecido é ANEXADO ao valor atual do campo,
// permitindo continuar ditando ou complementar o que já foi digitado.

import { useRef, useState, useEffect } from 'react'

// Detecta a API disponível (com ou sem prefixo do navegador)
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

export default function BotaoAudio({ valorAtual, aoReconhecer, titulo }) {
  const [gravando, setGravando] = useState(false)
  const [suportado] = useState(!!SpeechRecognitionAPI)
  const reconhecimentoRef = useRef(null)

  useEffect(() => {
    // Encerra o reconhecimento se o componente desmontar enquanto grava
    return () => {
      reconhecimentoRef.current?.stop()
    }
  }, [])

  function alternarGravacao() {
    if (!suportado) return

    if (gravando) {
      reconhecimentoRef.current?.stop()
      return
    }

    const reconhecimento = new SpeechRecognitionAPI()
    reconhecimento.lang = 'pt-BR'
    reconhecimento.interimResults = false
    reconhecimento.maxAlternatives = 1

    reconhecimento.onstart = () => setGravando(true)

    reconhecimento.onresult = evento => {
      const texto = evento.results[0][0].transcript.trim()
      if (!texto) return
      // Anexa ao texto já existente no campo, com espaço entre as partes
      const atual = (valorAtual || '').trim()
      aoReconhecer(atual ? `${atual} ${texto}` : texto)
    }

    reconhecimento.onerror = () => setGravando(false)
    reconhecimento.onend = () => setGravando(false)

    reconhecimentoRef.current = reconhecimento
    reconhecimento.start()
  }

  return (
    <button
      type="button"
      className={`botao-audio ${gravando ? 'botao-audio-gravando' : ''}`}
      onClick={alternarGravacao}
      disabled={!suportado}
      title={
        !suportado
          ? 'Ditado por voz não é suportado neste navegador'
          : titulo || (gravando ? 'Toque para parar' : 'Toque e fale para ditar')
      }
    >
      {gravando ? '⏺ Gravando…' : '🎙️ Ditar'}
    </button>
  )
}
