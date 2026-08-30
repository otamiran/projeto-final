# Notificações push — "nova ocorrência adicionada"

Isso implementa notificação real no celular (funciona mesmo com o app
fechado/minimizado), avisando quando alguém adiciona uma **ocorrência** em
um relatório **aberto**.

## O que foi adicionado no código

| Arquivo | Papel |
|---|---|
| `src/utilitarios/pushNotificacoes.js` | Pede permissão e inscreve o aparelho |
| `src/ganchos/useNotificacoesPush.js` | Controla o botão 🔔 na barra superior |
| `src/App.jsx` | Botão 🔔 / 🔕 ao lado do "Sair" |
| `public/sw.js` | Recebe o push e mostra a notificação no sistema |
| `supabase/sql/notificacoes_push.sql` | Tabela que guarda as inscrições |
| `supabase/functions/notificar-ocorrencia/index.ts` | Envia o push quando uma ocorrência é adicionada |
| `supabase/gerar_vapid.js` | Script para gerar as chaves VAPID |

Já existe um par de chaves VAPID de exemplo gerado (funciona, mas **gere o
seu próprio** antes de usar em produção — veja o passo 1).

## Passo a passo

### 1) Gerar suas próprias chaves VAPID (recomendado)
```bash
node supabase/gerar_vapid.js
```
Isso imprime `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`. Depois:
- Cole a `VAPID_PUBLIC_KEY` em `src/utilitarios/pushNotificacoes.js`
  (constante `CHAVE_PUBLICA_VAPID`).
- Guarde a `VAPID_PRIVATE_KEY` só para o passo 3 (**nunca** coloque ela no
  código do cliente/GitHub).

### 2) Criar a tabela no Supabase
No painel do Supabase → **SQL Editor** → cole e rode o conteúdo de
`supabase/sql/notificacoes_push.sql`.

### 3) Publicar a Edge Function
Requer o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e
login feito (`supabase login`):
```bash
supabase link --project-ref tdpgaqiktinngiuptatq

supabase secrets set VAPID_PUBLIC_KEY="<sua chave pública>"
supabase secrets set VAPID_PRIVATE_KEY="<sua chave privada>"
supabase secrets set VAPID_SUBJECT="mailto:seuemail@empresa.com"

supabase functions deploy notificar-ocorrencia
```

### 4) Ligar o "gatilho": Database Webhook
No painel do Supabase → **Database → Webhooks → Create a new webhook**:
- Table: `relatorios_abertos`
- Events: `Insert` e `Update`
- Type: **Supabase Edge Functions**
- Function: `notificar-ocorrencia`

Isso faz o Supabase chamar a função automaticamente sempre que um relatório
aberto é criado ou atualizado (que é como uma ocorrência é adicionada — veja
`adicionarItem`/`PainelItem.jsx`, que faz um `update` na coluna `itens`).

### 5) Publicar o app com as mudanças
```bash
npm run build
```
e reimplante no Vercel (ou onde o app estiver hospedado) normalmente.

### 6) Ativar no celular
1. Abra o app no navegador do celular e **instale/adicione à tela de início**
   (é esse passo que você já ia fazer).
2. Toque no ícone 🔔 ao lado do botão "Sair".
3. Aceite a permissão de notificação do sistema.

Pronto — a partir daí, sempre que alguém adicionar uma ocorrência em um
relatório aberto, todos os aparelhos com notificação ativada recebem um
aviso do tipo:

> 🔧 Nova ocorrência — Setor X
> Bomba 12: Vazamento no selo mecânico (turno da manhã)

## Ativação automática (sem precisar clicar no sino)

Agora o app pede a permissão de notificação **sozinho, assim que a pessoa
faz login** — ela só precisa tocar em "Permitir" na caixinha nativa que o
próprio navegador mostra. O sino 🔔 continua existindo, mas só como opção
manual pra quem recusou sem querer e quer tentar de novo, ou quer desativar.

**Limitação que não dá pra contornar:** por segurança, nenhum site, app,
servidor ou administrador consegue conceder essa permissão *pelo* usuário —
só o próprio aparelho da pessoa pode aceitar. É uma regra do navegador (vale
pra qualquer site, não é algo específico deste app). O toggle 🔔/🔕 no Admin
continua controlando se um aparelho **que já aceitou** vai receber ou não —
ele não consegue "ligar" a permissão em um aparelho que nunca aceitou.

Novos usuários já nascem com `notificacoes_ativas = true` (o padrão da
coluna), então o admin só precisa mexer no toggle pra exceções.

## Gerenciar quem recebe notificação (tela Admin)

Agora cada usuário aprovado, na seção **Usuários Ativos** do Admin, tem um
botão 🔔/🔕 ao lado de "Bloquear". Clicar nele liga/desliga o recebimento de
notificações push **dessa pessoa**, sem precisar mexer no aparelho dela.

Passos extras de banco de dados pra essa parte funcionar (além dos passos 1–4
já feitos):

1. Rode de novo o `supabase/sql/notificacoes_push.sql` completo no SQL
   Editor — ele agora também adiciona a coluna `notificacoes_ativas` na
   tabela `usuarios` e `usuario_id` na `push_inscricoes` (é seguro rodar de
   novo, os comandos novos usam `if not exists`).
2. Republique a Edge Function pra ela passar a respeitar essa preferência:
   ```bash
   supabase functions deploy notificar-ocorrencia --no-verify-jwt
   ```
3. Cada pessoa precisa **reativar** o sino 🔔 dela uma vez (só uma vez) pra a
   inscrição existente ficar associada ao usuário — inscrições feitas antes
   dessa atualização continuam recebendo normalmente até isso acontecer.

## Observações importantes

- **iPhone/iOS**: a Apple só entrega push para o Safari quando o site foi
  "Adicionado à Tela de Início" (instalado como app) — não funciona pelo
  Safari comum. Android funciona tanto instalado quanto direto no Chrome.
- Hoje a função notifica **todos** os aparelhos inscritos, sem filtrar por
  setor/turno/grupo. Se depois você quiser notificar só quem é do grupo
  `producao`, por exemplo, dá pra guardar o `grupo` do usuário na tabela
  `push_inscricoes` e filtrar dentro da Edge Function.
- Sem o passo 3 (deploy da função) e o passo 4 (webhook), o botão 🔔 até
  funciona (o navegador aceita a inscrição), mas nenhuma notificação chega,
  porque ninguém está enviando o push ainda.
