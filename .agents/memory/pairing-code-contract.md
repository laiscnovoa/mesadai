---
name: Contrato do código de pareamento
description: Regra durável para manter o pareamento numérico consistente entre servidor, QR e aplicativo móvel.
---

O código temporário de pareamento deve ter exatamente seis dígitos, incluindo suporte integral a 0 e 1, em todas as etapas do fluxo.

**Why:** Uma integração posterior restaurou códigos alfanuméricos no servidor enquanto o cliente Android esperava números; códigos válidos passaram a ser truncados e o pareamento falhou.

**How to apply:** Ao alterar autenticação ou pareamento, valide geração, exibição no QR, normalização do leitor e digitação manual com um código que contenha 0 ou 1.