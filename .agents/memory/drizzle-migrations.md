---
name: Migrações Drizzle no Replit
description: Convenção segura para migrações versionadas do banco neste workspace.
---

Configure a saída do Drizzle com caminho relativo ao pacote. Migrações versionadas podem rodar no pós-merge para preparar o banco de desenvolvimento; não adicione DDL ao build ou startup de produção, pois o Publish do Replit aplica o diff entre desenvolvimento e produção.

**Why:** Com `pnpm --filter`, os caminhos relativos são resolvidos a partir do pacote. O schema de produção é responsabilidade do fluxo Publish, não do processo da aplicação.

**How to apply:** Mantenha `out` relativo ao pacote, valide com `drizzle-kit check`, teste a migração contra o schema anterior e deixe a migração de produção para o fluxo Publish.