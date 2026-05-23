# Caixinha

App mobile gamificado de mesada para adolescentes, inspirado no Duolingo. O responsável cria a família, define tarefas com recompensas em R$ e data de encerramento do ciclo; o adolescente completa as tarefas enviando foto como prova; o responsável aprova, aprova parcialmente ou rejeita. O sistema gamifica o processo com XP, streaks, níveis e o mascote **Cofri** (moeda animada com expressões).

**Tagline:** "Sua mesada, seu futuro."

---

## Run & Operate

```bash
pnpm --filter @workspace/mesada-app run dev       # inicia o app Expo
pnpm --filter @workspace/mesada-app run typecheck  # checagem de tipos (deve dar 0 erros)
```

---

## Stack

- **Runtime**: Expo (React Native) com Expo Router v3
- **Persistência**: AsyncStorage (`mesada_data_v1`, `mesada_session_v1`) — MVP frontend-only, sem backend
- **UI**: StyleSheet nativo, `expo-linear-gradient`, `expo-blur`, `expo-symbols`
- **Câmera**: `expo-image-picker` (modo câmera obrigatório, galeria desabilitada)
- **Extras**: `expo-haptics`, `expo-clipboard`, `react-native-safe-area-context`
- **Linguagem**: TypeScript 5, português brasileiro em toda a UI

---

## Onde as coisas ficam

```
artifacts/mesada-app/
├── app/
│   ├── index.tsx                  # Tela de boas-vindas (home)
│   ├── parent-login.tsx           # Setup (4 etapas) + login do responsável com PIN
│   ├── child-pairing.tsx          # Login do adolescente (PIN 6 dígitos + apelido)
│   ├── (parent)/
│   │   ├── index.tsx              # Dashboard do responsável
│   │   ├── tasks.tsx              # Gerenciar tarefas (criar / editar / pausar / deletar)
│   │   └── cycle.tsx              # Fechar ciclo + apostas ativas dos filhos
│   ├── (child)/
│   │   ├── index.tsx              # Missões do dia + Cofri
│   │   └── progress.tsx           # XP, streak, saldo, metas, histórico de apostas
│   ├── submit/[taskId].tsx        # Envio de foto como prova
│   └── review/[submissionId].tsx  # Revisão de submissão pelo responsável
├── context/AppContext.tsx         # Toda a lógica de estado e persistência
├── types/index.ts                 # Interfaces e tipos (source of truth do modelo de dados)
└── components/
    ├── Cofri.tsx                  # Mascote moeda com 5 estados + tiers de cor por streak
    ├── StreakBadge.tsx             # Badge de streak com cor por tier
    ├── XPBar.tsx                  # Barra de XP
    ├── TaskCard.tsx               # Card de missão do adolescente
    ├── SubmissionCard.tsx         # Card de submissão pendente para o responsável
    ├── GoalCard.tsx               # Card de meta de poupança
    ├── ActiveBetCard.tsx          # Card de aposta ativa no streak
    └── BetModal.tsx               # Modal para fazer aposta no streak
```

---

## Modelo de dados (types/index.ts)

| Interface | Campos-chave |
|---|---|
| `Family` | `id`, `name`, `parentName`, `pin` (6 dígitos — filho), `parentPin` (4 dígitos — responsável), `cycleEndDate`, `cycleStartDate` |
| `Child` | `id`, `name`, `nickname`, `familyId` |
| `Task` | `id`, `title`, `description`, `rewardCents`, `frequency` (daily/weekly/once), `assignmentType` (all/individual/first), `assignedChildIds`, `active` |
| `TaskSubmission` | `id`, `taskId`, `childId`, `photoUri`, `status` (pending/approved/partial/rejected/appealed/appeal_rejected), `rewardCentsAwarded`, `parentComment`, `appealText` |
| `SavingsGoal` | `id`, `childId`, `title`, `targetCents` |
| `StreakBet` | `id`, `childId`, `durationDays` (7/14/20), `startDate`, `startStreak`, `status` (active/won/lost), `bonusPercent`, `bonusCentsAwarded` |
| `AppData` | `family`, `children[]`, `tasks[]`, `submissions[]`, `goals[]`, `streakBets[]` |

---

## Funcionalidades implementadas

### Responsável
- Setup em 4 etapas: nome da família → data de encerramento → **PIN do responsável (4 dígitos)** → cadastro do(a) filho(a)
- Login protegido por PIN — o adolescente não consegue acessar a área do responsável
- Criar / **editar** / pausar / deletar tarefas com 3 tipos de atribuição:
  - **Todos** — todos os filhos precisam completar
  - **Individual** — só filhos selecionados por checkbox
  - **Livre** — primeiro a ser aprovado ganha, task some para os demais
- Aprovar / aprovar parcialmente / rejeitar submissões com comentário
- Revisar recursos (appeal) de rejeições
- Fechar ciclo com extrato final
- Ver apostas ativas e histórico de apostas dos filhos na tela de Ciclo
- PIN do adolescente copiável com um toque para compartilhar
- Botão "Início" visível para sair para a tela inicial

### Adolescente
- Login via PIN de 6 dígitos + apelido
- Tela de missões do dia com o Cofri reagindo ao progresso
- Enviar foto como prova de conclusão (câmera obrigatória, sem galeria)
- Abrir recurso em submissões rejeitadas
- Tela de progresso: XP, streak, nível, saldo, metas de poupança
- **Apostar no streak**: comprometer 7, 14 ou 20 dias consecutivos por bônus de +10% / +20% / +35% no saldo do ciclo
- Histórico de apostas ganhas/perdidas
- Botão "Início" visível para sair para a tela inicial

### Cofri (mascote)
- Moeda com face expressiva e braços
- 5 estados: `neutral`, `charging`, `happy`, `celebrating`, `sleeping`
- 6 tiers de cor por streak: Bronze (0–3d) → Bronze Brilhante (4–6d) → Prata (7–13d) → Ouro Bronze (14–20d) → Ouro (21–29d) → Ouro Supremo (30+d)
- Glow animado para streaks ≥ 14 dias; wiggle ao celebrar

---

## Limitações conhecidas (MVP frontend-only)

| Limitação | Impacto | Solução futura |
|---|---|---|
| Dados em AsyncStorage | Sem sincronização entre dispositivos | Supabase Postgres + RLS |
| PINs em texto simples | Risco se alguém exportar o storage | Hashing (bcrypt/Argon2) |
| Fotos como URI local | Prova não persiste após reinstalar | Upload Supabase Storage |
| Sem push notifications | Responsável não é alertado em tempo real | Expo Notifications + tokens |
| `Alert.prompt` no appeal | Não funciona no Android/web | TextInput customizado no modal |
| Sem rate limiting no PIN | Força bruta manual possível | Cooldown após 3 tentativas |
| Famílias legadas sem `parentPin` | Entram sem PIN após atualização | Banner "Crie seu PIN" no dashboard |

---

## Decisões de arquitetura

- **Frontend-only deliberadamente**: MVP para validar UX sem custo de infra. Toda a lógica vive em `AppContext.tsx` com hooks derivados.
- **Dois PINs separados**: `pin` (6 dígitos) é o PIN do adolescente; `parentPin` (4 dígitos) protege a área do responsável. Armazenados separadamente em `Family`.
- **`assignmentType: 'first'`**: Tarefas "livre" usam `isTaskClaimedForCycle()` para esconder a tarefa dos demais filhos após a primeira aprovação no ciclo.
- **Streak bet com resolução reativa**: `resolveStreakBets` é chamado a cada mudança em `submissions` via `useEffect`, e explicitamente em `reviewSubmission` e `reviewAppeal`. Detecção de quebra é baseada em calendário dia-a-dia (evita off-by-one de fórmulas relativas).
- **Câmera obrigatória**: `mediaTypes: ['images']` + câmera forçada — galeria desabilitada para garantir que a foto é contemporânea à tarefa.

---

## User preferences

- UI sempre em **português brasileiro**
- Sem emojis nas respostas do agente
- TypeScript deve passar `0 erros` antes de entregar qualquer alteração (`pnpm --filter @workspace/mesada-app run typecheck`)
- Não usar `Alert.prompt` (iOS-only) — usar TextInput customizado em modal
- Mascote é uma **moeda** (não um porco/pig) desde o redesign do Cofri
