# Guia — do zero ao deploy na Vercel

Resumo prático do setup feito no Dia 1. Serve para replicar em qualquer máquina/projeto novo.

---

## Fase 1 — Setup do ambiente (feito só 1x por máquina)

**Verificar o que já tem:**
```bash
git --version
node --version
```

**Configurar identidade no Git:**
```bash
git config --global user.name "Seu Nome"
git config --global user.email "ID+usuario@users.noreply.github.com"
```
> O e-mail noreply vem de https://github.com/settings/emails (marcar "Keep my email addresses private") — evita vazar seu e-mail pessoal nos commits.

**Boas práticas globais do Git:**
```bash
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.autoSetupRemote true
git config --global core.editor "code --wait"
```

**Chave SSH para o GitHub** (só se não tiver `~/.ssh/id_ed25519` ainda):
```bash
ssh-keygen -t ed25519 -C "seu-email-noreply"
```
Depois copie `~/.ssh/id_ed25519.pub` e adicione em https://github.com/settings/ssh/new. Teste com `ssh -T git@github.com` — deve responder "Hi usuario!".

---

## Fase 2 — Criar o projeto Next.js

```bash
cd ~/Documents
npx create-next-app@latest nome-do-projeto \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*" --use-npm --yes
cd nome-do-projeto
npm run lint
npm run build
npm run dev
```
> O `create-next-app` já cria `.gitignore` correto, inicializa o Git e faz o primeiro commit sozinho. Abra http://localhost:3000 para ver.

---

## Fase 3 — Publicar no GitHub

1. **Crie o repo vazio** em https://github.com/new:
   - Nome: `nome-do-projeto`
   - **Sem** README, **sem** .gitignore, **sem** license (evita conflito com o commit local)

2. **Conecte e envie:**
```bash
git remote add origin git@github.com:seu-usuario/nome-do-projeto.git
git push
```

---

## Fase 4 — Deploy na Vercel (feito só 1x por projeto)

1. Entre em https://vercel.com/new (login com GitHub)
2. Se for a 1ª vez: autorize a Vercel na sua conta em https://github.com/apps/vercel/installations/new (pode escolher "All repositories" ou só o repo específico)
3. Clique **Import** no repositório
4. Deixe os campos auto-detectados (Framework: Next.js, Root: `./`)
5. Clique **Deploy**
6. Em ~1min você tem URL pública tipo `nome-do-projeto.vercel.app`

---

## Fase 5 — Fluxo diário (toda mudança daqui pra frente)

```bash
# 1. edite arquivos no VS Code
# 2. verifique o que mudou
git status
# 3. prepare pro commit
git add .
# 4. commite com mensagem descritiva
git commit -m "feat: descrição do que fez"
# 5. envie — a Vercel rebuilda automaticamente
git push
```
> Após ~1min o site de produção já reflete sua mudança. Nenhuma intervenção manual na Vercel.

---

## Convenção de mensagens de commit

- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` tarefa de manutenção (config, dependências)
- `docs:` só documentação
- `refactor:` mudança sem alterar comportamento
