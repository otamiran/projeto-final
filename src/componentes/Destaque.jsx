// Destaca visualmente o trecho que corresponde à busca dentro de um texto.
// Segue o padrão dos outros componentes do projeto: função simples, sem estado.

export default function Destaque({ texto, busca }) {
  if (!busca || !texto) return <>{texto}</>

  const regex  = new RegExp(
    `(${busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  )
  const partes = String(texto).split(regex)

  return (
    <>
      {partes.map((parte, i) =>
        regex.test(parte)
          ? <mark key={i} className="almox-destaque">{parte}</mark>
          : parte
      )}
    </>
  )
}
