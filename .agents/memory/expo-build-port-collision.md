---
name: Expo build port collision
description: Como validar o MesadAI quando o build estático disputa a porta do Canvas.
---

O build estático personalizado do Expo pode falhar ao tentar iniciar o Metro quando o Canvas já ocupa a porta 8081, mesmo com o código compilando corretamente.

**Why:** O script de build usa uma porta fixa e o prompt de troca de porta não funciona em modo não interativo.

**How to apply:** Com ambos os workflows ativos, valide os três bundles com `expo export --platform all` em um diretório temporário; trate a disputa da porta como infraestrutura, não como erro do app.