// Mensagem temporária que aparece e desaparece no rodapé da tela

export default function Aviso({ aviso }) {
  // A classe 'visivel' aciona a animação CSS de entrada
  return (
    <div className={`aviso ${aviso.visivel ? 'visivel' : ''} ${aviso.erro ? 'erro' : ''}`}>
      {aviso.texto}
    </div>
  )
}
