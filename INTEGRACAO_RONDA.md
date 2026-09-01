# Integração do "Gerenciador de Ronda" no "Passagem de Turno"

Este projeto agora contém os dois sistemas num só app. Resumo do que foi feito
e o que você precisa fazer antes de publicar.

## O que mudou

- **Novo módulo `src/ronda/`**: todo o código da ronda (componentes, hooks,
  lógica de manutenção, CSS) foi movido para dentro do projeto final, isolado
  nessa pasta.
- **Nova aba "🔄 Ronda"** no menu, visível para todos os grupos (produção,
  manutenção e admin) — controlada pela flag `ABA_RONDA_ATIVA` em
  `src/utilitarios/constantes.js` (é só trocar para `false` se quiser
  desativar sem apagar o código, igual já funciona com `ABA_ALMOX_ATIVA`).
- **Banco de dados unificado**: a ronda agora usa o **mesmo client Supabase**
  do Passagem de Turno (`src/utilitarios/supabase.js`), em vez de um projeto
  Supabase separado. As tabelas da ronda foram renomeadas com prefixo
  `ronda_` para não colidir com a tabela `setores` que já existia (schema
  diferente, sem relação com a ronda):
  - `ronda_setores`, `ronda_grupos`, `ronda_maquinas`, `ronda_estacoes`
  - `ronda_manutentores`, `ronda_atendimentos_manutencao`
- **Login unificado**: o antigo botão "⚙ Gerenciar" da ronda pedia uma senha
  própria fixa no código (`SENHA_ADMIN`). Isso foi removido — agora só quem
  já está logado como **admin** no Passagem de Turno enxerga e consegue usar
  o botão "Gerenciar" (editar setores/grupos/máquinas/estações da ronda).
- **CSS 100% isolado**: todo o `estilos.css` da ronda foi escopado dentro de
  `.ronda-modulo` (inclusive variáveis de cor, renomeadas para `--ronda-*`, e
  os `@keyframes`), então não há risco de um estilo vazar por cima do outro.
- **Status/observação/histórico da ronda continuam locais** (no aparelho de
  quem faz a ronda, via `localStorage`) — isso não mudou, é assim que o app
  original já funcionava.

## O que você precisa fazer antes de publicar

1. **Rodar o SQL no Supabase do Passagem de Turno.**
   Abra o SQL Editor do projeto Supabase do turno e rode o arquivo
   `supabase/sql/ronda_schema.sql`. Ele cria as 6 tabelas `ronda_*` com RLS e
   policies públicas (mesmo modelo do schema original da ronda). É seguro
   rodar mais de uma vez.

2. **(Opcional) Migrar dados existentes.**
   Se o banco antigo da ronda (projeto Supabase separado) já tinha
   setores/grupos/máquinas/estações cadastrados, exporte cada tabela em CSV
   pelo Table Editor do projeto antigo e importe nas tabelas `ronda_*`
   correspondentes no projeto novo (os `id` em UUID são preservados, então os
   vínculos entre setor → grupo → máquina → estação continuam corretos).

3. **Instalar dependências e testar.**
   ```bash
   npm install
   npm run dev
   ```
   Nenhuma dependência nova foi adicionada — o projeto final já tinha tudo
   que a ronda precisa (`react`, `react-dom`, `@supabase/supabase-js`).

   > Nota: não foi possível rodar `npm install` / `npm run build` neste
   > ambiente (sem acesso à internet para baixar pacotes). Fiz uma revisão
   > estática completa — todos os imports resolvem para arquivos existentes,
   > chaves/parênteses/colchetes de todos os arquivos tocados estão
   > balanceados, e o CSS foi validado programaticamente (nenhum seletor sem
   > escopo). Ainda assim, rode `npm run build` no seu ambiente antes de
   > publicar, como checagem final.

4. **Testar o fluxo:**
   - Login como `admin` → aba "Ronda" aparece → botão "⚙ Gerenciar" habilitado
     → cadastrar um setor/grupo/máquina/estação de teste.
   - Login como usuário de produção/manutenção → aba "Ronda" aparece, mas
     sem o botão "Gerenciar" (só visualiza/preenche status).
   - Rodar uma ronda completa, gerar relatório WhatsApp, encerrar ronda e
     conferir o histórico local.
   - Testar "🔧 Manutenção" (cadastrar manutentor, registrar pendência,
     assumir atendimento, encerrar).

## Arquivos que ficaram sem uso (não removidos, por segurança)

- `src/ronda/componentes/BloqueioNome.jsx` — não estava sendo usado nem no
  app original da ronda; deixei o arquivo mas ele não é importado em
  nenhum lugar.

## Se quiser reverter a integração

Basta remover a pasta `src/ronda/`, o import de `RondaApp` e os trechos
`ABA_RONDA_ATIVA` em `App.jsx`/`constantes.js`. Nada foi alterado nas
tabelas ou telas originais do Passagem de Turno.
