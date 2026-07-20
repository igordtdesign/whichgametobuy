-- Reclassifica como +18 os jogos que a Steam não marcou com descriptor oficial
-- mas cujas tags de alta precisão indicam conteúdo sexual. Eles passam a seguir
-- o toggle +18 do site (escondidos por padrão, visíveis com confirmação de idade).
--
-- "Nudity" e "Mature" ficam de fora de propósito: pegariam jogos mainstream
-- (Cyberpunk 2077 tem "Nudity", por exemplo).
--
-- Rode uma vez no SQL Editor do Supabase.

update games
set adult = true
where not adult
  and tags && array['Sexual Content', 'Hentai', 'NSFW'];
