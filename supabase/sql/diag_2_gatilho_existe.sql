select tgname, tgrelid::regclass as tabela, tgenabled
from pg_trigger
where tgname = 'trigger_notificar_ocorrencia';
