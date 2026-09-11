# TechCycle - PostgreSQL e autenticacao

## O que instalar

- Node.js LTS (ja instalado neste computador).
- PostgreSQL 17 e pgAdmin 4. O PostgreSQL 17 ja esta instalado e ativo em `localhost:5432`.
- Dependencias Node: execute `npm install` para instalar o driver `pg` e as demais bibliotecas.

## Criar o banco

1. Abra o pgAdmin ou o SQL Shell (psql), conecte-se como `postgres` na porta `5432` usando a senha definida durante a instalacao.
2. Execute [database/create-database.sql](database/create-database.sql).
3. Copie `.env.example` para `.env` e preencha `DATABASE_URL` com a senha real, por exemplo `postgresql://postgres:SUA_SENHA@localhost:5432/techcycle`.
4. Execute `npm run db:init` para criar ou atualizar as tabelas.
5. Execute `npm start` e abra `http://localhost:3000`.

## Tabelas

- `users`: contas e hash bcrypt da senha.
- `sessions`: tokens de sessão com hash HMAC e validade.
- `posts`: publicacoes do feed.
- `comments`: comentarios de posts.
- `post_favorites`: favoritos; sua chave primaria composta impede o mesmo usuario de favoritar o mesmo post duas vezes.

## Politica de nomes de usuario

A tabela `blocked_usernames` bloqueia termos ofensivos e referências historicamente inaceitáveis no cadastro e na verificação de disponibilidade. A lista inicial fica em `database/username-blocklist.sql`; para acrescentar um item, insira sua versão sem acentos e em minúsculas nessa tabela. O sistema retorna uma mensagem genérica, sem revelar a categoria do bloqueio.

A restricao principal contra usuarios duplicados e o indice unico `users_username_lower_unique`: `Marina`, `marina` e `MARINA` sao considerados o mesmo nome. A tabela tambem tem uma `CHECK` que exige apenas letras e primeira letra maiuscula.
