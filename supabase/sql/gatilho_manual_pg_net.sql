-- Alternativa ao "Database Webhooks" pela interface (que tem um bug conhecido
-- retornando "schema supabase_functions does not exist" em alguns projetos).
-- Isso faz a MESMA coisa, mas direto por SQL, sem depender dessa tela.
--
-- Rode isso no SQL Editor do Supabase DEPOIS de já ter feito o
-- `supabase functions deploy notificar-ocorrencia --no-verify-jwt`
-- (o --no-verify-jwt é importante: sem ele, a função exige um token de
-- autenticação que o Postgres não vai enviar, e a chamada falha com 401).

-- 1) Habilita a extensão que permite o Postgres fazer chamadas HTTP
create extension if not exists pg_net with schema extensions;

-- 2) Função que é chamada sempre que relatorios_abertos muda,
--    e repassa os dados pra Edge Function notificar-ocorrencia
create or replace function notificar_nova_ocorrencia()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://tdpgaqiktinngiuptatq.supabase.co/functions/v1/notificar-ocorrencia',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'type',       TG_OP,                                            -- 'INSERT' ou 'UPDATE'
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    )
  );
  return NEW;
end;
$$;

-- 3) Liga a função na tabela relatorios_abertos
drop trigger if exists trigger_notificar_ocorrencia on relatorios_abertos;

create trigger trigger_notificar_ocorrencia
after insert or update on relatorios_abertos
for each row
execute function notificar_nova_ocorrencia();

-- Pronto. A partir de agora, todo insert/update em relatorios_abertos
-- chama a Edge Function automaticamente — sem precisar da tela de Webhooks.
