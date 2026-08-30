---
name: Segredos de recuperação do responsável
description: Limites de exposição e proteção das credenciais usadas para recuperar acesso de responsável.
---

O acesso de responsável em um aparelho novo usa somente o PIN de seis dígitos. O PIN deve continuar armazenado como derivação scrypt com salt; a localização da família usa um HMAC determinístico separado, protegido por segredo do servidor e com unicidade garantida no banco.

**Why:** O PIN precisa identificar uma única família sem ficar recuperável a partir de um vazamento isolado do banco.

**How to apply:** Nunca inclua o PIN ou seu identificador HMAC no snapshot. Limite tentativas de forma persistente por origem e PIN. Famílias anteriores ao contrato de seis dígitos não são compatíveis e devem ser recriadas.