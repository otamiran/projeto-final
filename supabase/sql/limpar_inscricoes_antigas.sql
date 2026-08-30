-- Limpa todas as inscrições de push salvas. É seguro rodar — ninguém perde
-- acesso ao app, só precisa reabrir/relogar uma vez pra reativar as
-- notificações (o app já pede a permissão sozinho no login, então isso é
-- rápido pra todo mundo).
delete from push_inscricoes;
