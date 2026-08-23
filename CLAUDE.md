# Intuitiva — diário de comer intuitivo da Helena

App de experimento de 1 mês (ago–set 2026): comer o que quiser, guiada pelos sinais do
estômago (escala de fome/saciedade 1–10), sem calorias, sem restrição, sem julgamento.
Tom de nutricionista gentil. Interface em português, paleta pastel (creme/azul/verde/rosa).

**Live:** https://helenaguerra002-tech.github.io/intuitiva/
**Repo:** `helenaguerra002-tech/intuitiva` (público — só código, nunca dados)

## Arquitetura

PWA estático, **sem backend**. Um arquivo faz tudo:

- `index.html` — o app inteiro (CSS e JS inline). Única fonte da verdade.
- `sw.js` — service worker network-first com fallback em cache (funciona offline).
  **Ao mudar o app, incrementar `CACHE = 'intuitiva-vN'`** para forçar atualização.
- `manifest.json`, `icons/` — instalação na tela de início. Ícones gerados por script
  Pillow (o arco fome→saciedade). Regenerar só se a identidade visual mudar.

## ⚠ Onde os dados vivem

**Só no navegador do aparelho da Helena.** Nada vai para servidor nenhum.

- `localStorage`:
  - `intuitiva_entries` — refeições `{id, ts, foods, photoId?, hungerBefore,
    fullnessAfter, protein, satisfied('sim'|'meio'|'nao'), feelings[], feelingNote,
    context[], status('open'|'done')}`
  - `intuitiva_weight` — `[{date, kg}]` (máx. 1 por semana, imposto na UI)
  - `intuitiva_checkins` — `[{weekStart, savedAt, answers[4]}]` (semana começa segunda)
  - `intuitiva_lastBackup` — timestamp do último export
- `IndexedDB intuitiva-photos` — fotos comprimidas (~600px JPEG). localStorage não
  aguenta imagem.

**Backup é o único seguro de vida**: botão "exportar backup" na aba *mais* gera JSON
completo (incluindo fotos em dataURL); "importar backup" restaura tudo (substitui, não
mescla). Banner lembra se passar de 7 dias sem backup. Limpar dados do navegador /
desinstalar o PWA = perder tudo desde o último export.

**Usar sempre o app instalado na tela de início**, não a aba do Safari — o Safari pode
descartar storage de site não visitado por 7 dias; o app instalado é isento.

## Decisões que não são acidente (não "consertar")

- **Zero calorias em qualquer lugar do app.** É o ponto do experimento.
- "Quanto tempo te segurou" é **calculado** da diferença entre registros consecutivos
  (só conta gaps entre 20min e 10h — evita atravessar a noite). Nunca vira campo digitado.
- Peso: 1×/semana, escondido atrás de um toque na aba *mais*, nunca aparece perto de
  refeições. O bloqueio de pesagem repetida é proposital.
- Proteína é pergunta neutra com dica de *adicionar* (nunca substituir/cobrar).
- Padrões só aparecem com ≥5 registros completos; linguagem sempre sem julgamento.
- Tema claro fixo (pastel) — decisão de design, não bug de dark mode.
- Cores de dados dos gráficos validadas p/ daltonismo contra o fundo creme:
  azul `#3E7CB8`, verde `#74A968`, rosa `#993556` (verde exige rótulo direto — todos
  os gráficos têm).

## Publicar mudanças

```bash
git add -A && git commit -m "..." && git push
```

GitHub Pages serve o branch `main` direto (sem build). Lembrar do bump de `CACHE` no
`sw.js`; no celular, fechar e reabrir o app 1–2× para o service worker trocar de versão.
