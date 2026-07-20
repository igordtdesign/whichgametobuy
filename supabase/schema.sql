-- Estrutura do catálogo no Supabase (Estágio 2 da migração pra busca vetorial).
-- Rode isto uma vez no SQL Editor do Supabase (Dashboard > SQL Editor > New query).

-- 1. Extensão de busca vetorial (pgvector)
create extension if not exists vector;

-- 2. Tabela do catálogo. embedding vector(768): o "significado" de cada jogo.
create table if not exists games (
  appid        integer primary key,
  name         text not null,
  tags         text[] not null default '{}',
  review_pct   integer not null,
  review_count integer not null,
  short        text,
  adult        boolean not null default false,
  embedding    vector(768)
);

-- 3. Índice HNSW por distância de cosseno: busca por similaridade rápida.
create index if not exists games_embedding_idx
  on games using hnsw (embedding vector_cosine_ops);

-- 4. Segurança: RLS ligado, SEM política de leitura pública.
--    Ninguém acessa a tabela via chave pública. Só o service_role (servidor),
--    que ignora RLS por natureza. Defesa em profundidade.
alter table games enable row level security;

-- 5. Função de busca: recebe o vetor da pergunta e devolve os N jogos mais
--    próximos, já filtrando conteúdo adulto conforme o toggle do site.
create or replace function match_games(
  query_embedding vector(768),
  match_count     integer default 12,
  include_adult   boolean default false
)
returns table (
  appid        integer,
  name         text,
  tags         text[],
  review_pct   integer,
  review_count integer,
  short        text,
  adult        boolean,
  similarity   float
)
language sql
stable
as $$
  select
    g.appid, g.name, g.tags, g.review_pct, g.review_count, g.short, g.adult,
    1 - (g.embedding <=> query_embedding) as similarity
  from games g
  where g.embedding is not null
    and (include_adult or not g.adult)
  order by g.embedding <=> query_embedding
  limit match_count;
$$;
