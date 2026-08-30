-- 1) Mostra as últimas chamadas HTTP que o pg_net tentou fazer
--    (isso é o que o gatilho dispara ao chamar a Edge Function).
--    Se vier VAZIO, o gatilho nunca foi acionado.
select * from net._http_response order by created desc limit 10;

-- 2) Confirma que o gatilho e a função existem no banco
select tgname, tgrelid::regclass as tabela, tgenabled
from pg_trigger
where tgname = 'trigger_notificar_ocorrencia';

-- 3) Confirma que a extensão pg_net está mesmo habilitada
select extname, extversion from pg_extension where extname = 'pg_net';
