# TH IA (TH-5.5)

Plataforma completa de Inteligência Artificial — backend em Node.js/TypeScript/Express/Socket.IO/MySQL/Redis e frontend em Next.js/TailwindCSS/Framer Motion.

## Status deste esqueleto

Este é o **esqueleto completo e funcional** do projeto: arquitetura, banco de dados, autenticação, licenciamento (keys premium), rate limit do plano FREE, painel administrativo protegido, gateway Socket.IO e interface (sidebar, busca, favoritos, modal de ativação Premium com WhatsApp) já estão implementados e funcionam de ponta a ponta.

O que ainda falta (bem pontual):
- CSRF explícito não foi implementado à parte — como toda autenticação usa Bearer token (JWT no header `Authorization`, não em cookie), o vetor clássico de CSRF (cookies enviados automaticamente pelo navegador) não se aplica aqui; por isso o `csurf` foi removido em vez de adicionado sem necessidade real.
- Sistema de plugins genérico (a arquitetura de ferramentas — calculadora, pesquisa, imagem — já segue um padrão fácil de estender, mas não existe um "marketplace" de plugins de terceiros).

## Edição de imagens

Presets prontos usando a API de edição de imagens (formato OpenAI Images Edit — `/api/image/edit`): remover objeto, trocar fundo, restaurar foto antiga, aumentar qualidade/upscale, ou um prompt customizado. Usa o mesmo cadastro de provedores `image_gen` já configurado pra geração.

## Calculadora e pesquisa na internet

Dois novos modos na barra do chat (ícones de calculadora e globo), no mesmo padrão do modo de geração de imagem:
- **Calculadora**: usa `mathjs` no backend — resultado exato, instantâneo, sem gastar tokens de IA nem depender do modelo saber fazer conta.
- **Pesquisa**: usa um provedor configurado pelo admin (Tavily ou Serper, cadastrados como provider igual aos de IA) se existir; senão cai automaticamente no DuckDuckGo (gratuito, sem key nenhuma) — funciona mesmo sem configuração extra.

## 2FA opcional

Em `/settings`: ativa verificação em duas etapas via TOTP (Google Authenticator, Authy, etc.), com QR code gerado na hora. Uma vez ativado, o login pede o código de 6 dígitos numa segunda etapa antes de liberar o token — pode ser desativado a qualquer momento pelo próprio usuário.

## Documentação da API (Swagger)

Disponível em `/api/docs` (Swagger UI) assim que o backend estiver rodando — cobre autenticação, chat, upload, imagem, ferramentas, perfil/memória, 2FA, painel admin e a API pública `/api/v1`.

## Memória longa e perfil

Página `/settings` (acessível pelo botão "Configurações" ou pelo nome do usuário na sidebar):
- **Perfil**: nome, idioma, estilo de resposta e personalidade — tudo isso vira uma mensagem `system` injetada automaticamente em toda conversa (`memory.service.ts` → `buildMemorySystemPrompt`).
- **Memória longa**: fatos livres tipo chave/valor (ex: "projeto_atual: TH IA") que a IA lembra em qualquer chat novo, sem precisar repetir contexto. Fica salvo na tabela `user_memory` e some só se você excluir.

Mensagens do usuário agora também são editáveis (ícone de lápis) — editar reenvia a mensagem corrigida e gera uma nova resposta, no lugar da antiga.

## Voz e OCR

- **Voz para texto**: botão de microfone na barra do chat usa a Web Speech API do navegador (`useSpeechRecognition.ts`) — dita a mensagem direto, sem precisar de nenhuma API paga. Funciona em Chrome/Edge; navegadores sem suporte simplesmente escondem o botão.
- **Texto para voz**: botão de "ouvir" em cada resposta do assistente usa `speechSynthesis` do navegador (`textToSpeech.ts`) — mesma lógica, zero custo de API.
- **OCR**: imagens enviadas no chat passam por reconhecimento de texto local com Tesseract.js (`ocr.service.ts`, português + inglês) — roda no próprio backend, sem depender de serviço externo. O texto reconhecido entra no contexto da IA junto com a visão nativa da imagem.

## Geração de imagens

Botão de varinha mágica (Wand2) na barra do chat ativa o "modo geração de imagem": o texto digitado vira prompt em vez de mensagem de chat. Usa o formato de API OpenAI Images (`/v1/images/generations`), compatível com OpenAI DALL-E e qualquer provedor compatível com esse formato.

Pra ativar: no painel admin (`/admin/providers`), cadastre um provider (ex: OpenAI) e um modelo com tarefa **image_gen** (ex: `dall-e-3`). Igual aos modelos de chat, dá pra cadastrar mais de um com prioridades diferentes para fallback automático.

## Upload, leitura de arquivos e visão

Já funciona de ponta a ponta: o botão de clipe no chat aceita imagens, PDF, DOCX, TXT, CSV, Excel, PPTX, ZIP, RAR, código-fonte e áudio/vídeo (`backend/src/middlewares/upload.middleware.ts` valida tipo e tamanho — `UPLOAD_MAX_SIZE_MB` no `.env`).

- **Visão real**: imagens anexadas são lidas do disco e enviadas em base64 como blocos de imagem nativos para o modelo — funciona com Claude (Anthropic), GPT-4o e afins (OpenAI-compatível) e modelos com visão no Ollama (ex: llava). Por custo de payload, só as últimas 4 imagens da conversa entram no contexto.
- PDF, DOCX, TXT/código e planilhas (XLSX/CSV) têm o texto extraído automaticamente (`fileExtraction.service.ts`) e injetado no contexto enviado à IA.
- ZIP/RAR e áudio/vídeo ficam salvos e acessíveis por URL, mas ainda não têm extração de conteúdo (transcrição de áudio, etc.).
- Arquivos ficam em `backend/uploads` (volume `th_ia_uploads` no Docker) e são servidos em `/uploads/:arquivo`.

## Deploy em produção: onde hospedar cada parte

**Importante:** o Netlify sozinho não roda a stack inteira. Ele hospeda bem o **frontend** (Next.js), mas não roda o **backend** (Express + Socket.IO + MySQL + Redis) — não tem banco de dados persistente nem suporte a conexões WebSocket de longa duração em funções serverless. Se você só subir o frontend lá sem o backend rodando em algum outro lugar, o site abre mas login/chat não funcionam.

Divida assim:

| Parte | Onde hospedar | Observação |
|---|---|---|
| Frontend (Next.js) | Netlify, Vercel | Use o `frontend/netlify.toml` já incluso; defina `NEXT_PUBLIC_API_URL` apontando pro backend |
| Backend (API + Socket.IO) | VPS com Docker (o `docker-compose.yml` já está pronto), Railway, Render, Fly.io | Precisa suportar processo persistente/WebSocket, não serverless puro |
| MySQL + Redis | Junto do backend (Docker Compose) ou serviços gerenciados (PlanetScale, Railway, Upstash) | |

Passo a passo pro Netlify (frontend):
1. Suba o backend em algum host que aceite Node persistente (VPS com `docker compose up -d`, ou Railway/Render apontando pra pasta `backend`).
2. No Netlify, o "base directory" já fica configurado como `frontend` pelo `netlify.toml`.
3. Em Site settings → Environment variables, defina `NEXT_PUBLIC_API_URL` com a URL pública do backend (ex: `https://api.seudominio.com`).
4. No `.env` do backend, ajuste `FRONTEND_URL` para a URL do Netlify — senão o CORS bloqueia as requisições.

## Como rodar (desenvolvimento)

```bash
# 1. Backend
cd backend
cp .env.example .env   # edite as variáveis, principalmente JWT_SECRET e ADMIN_PASSWORD
npm install
npm run migrate        # cria o banco, todas as tabelas e a conta única de admin
npm run dev

# 2. Frontend
cd frontend
npm install
npm run dev
```

## Como rodar (produção, com Docker)

```bash
cp backend/.env.example backend/.env   # configure antes de subir
docker compose up -d --build
docker compose exec backend npm run migrate
```

- Backend: http://localhost:4000
- Frontend: http://localhost:3000

## Licenciamento Premium

- Todo novo usuário entra automaticamente no plano **FREE** (15 mensagens a cada 5 horas).
- Para virar **PREMIUM**, o usuário clica em "Ativar Premium" na sidebar, vê o preço e o botão que abre o WhatsApp já com a mensagem preenchida, e insere a key recebida.
- Cada key só pode ser usada por **uma conta** (uso único) e expira automaticamente em **30 dias** (configurável em `PREMIUM_KEY_DURATION_DAYS`), voltando o usuário para FREE.
- O administrador gera/revoga/exclui keys via `POST /api/admin/keys`, `PATCH /api/admin/keys/:id/revoke`, `DELETE /api/admin/keys/:id` (todas exigem token de admin — qualquer outra requisição recebe **403**, mesmo que a URL seja descoberta).

## API pública mensal (separada do Premium)

Sistema de acesso via API, com o mesmo espírito do licenciamento Premium mas pra outro público (desenvolvedores/integrações), gerenciado em `/admin/api-keys`:

- Só o **administrador** gera a key — não existe autoatendimento nem compra automática.
- Cada key fica ativa por **30 dias** a partir da geração e depois **para de funcionar sozinha** (o job periódico do servidor marca como `EXPIRED`, e a validação também expira na hora se alguém tentar usar uma vencida).
- A key dá acesso a `/api/v1/chat/completions` e `/api/v1/images/generations` — formato compatível com a API da OpenAI, então qualquer integração que já fale esse protocolo funciona só trocando a URL base e a key.
- Autenticação via header `Authorization: Bearer <key>` (ou `x-api-key`).
- Rate limit próprio de 60 requisições/minuto por IP, independente do limite do plano FREE do chat interno.
- Revogar ou excluir uma key derruba o acesso na hora, sem esperar os 30 dias.

Tabela `api_keys` no banco guarda status, contagem de uso e data da última chamada — dá pra acompanhar consumo por integração direto no painel.

## Painel Administrativo

Acesse `http://localhost:3000/admin/login` com a conta única criada em `npm run migrate` (`ADMIN_EMAIL`/`ADMIN_PASSWORD` do `.env`). De lá dá pra:
- Ver o dashboard (usuários, premium ativos, keys)
- Gerar/revogar/excluir keys premium
- Gerar/revogar/excluir API keys mensais (acesso à API pública `/api/v1`)
- Bloquear/desbloquear/excluir usuários
- Cadastrar provedores de IA (OpenAI, Anthropic, Google, Mistral, DeepSeek, Groq, OpenRouter, Ollama) e seus modelos, com prioridade e fallback automático

Essa rota é completamente separada da autenticação de usuário comum (token, storage e guarda próprios) e a API por trás (`/api/admin/*`) sempre responde **403** para qualquer requisição sem token de admin válido — mesmo que a URL seja descoberta.

## Conectando um provedor de IA real

O chat já está 100% integrado ao roteador multi-IA (Anthropic, OpenAI e compatíveis como Groq/DeepSeek/OpenRouter, e Ollama local), com streaming real e fallback automático entre modelos. Falta só cadastrar um provedor — isso ainda não tem tela no frontend, então use a API do admin diretamente:

```bash
# 1. Login como admin
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thia.local","password":"sua_senha"}'
# copie o accessToken retornado

# 2. Cadastrar o provedor (exemplo com Anthropic)
curl -X POST http://localhost:4000/api/admin/providers \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Anthropic","providerKey":"anthropic","apiKey":"sk-ant-..."}'
# copie o id retornado (ou pegue via GET /api/admin/providers)

# 3. Cadastrar um modelo desse provedor para a tarefa "chat"
curl -X POST http://localhost:4000/api/admin/models \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"providerId":"ID_DO_PROVIDER","modelName":"claude-sonnet-4-6","taskType":"chat","priority":10}'
```

Pronto — o próximo `chat:message` enviado via Socket.IO já vai usar esse modelo de verdade, com streaming token a token. Cadastre mais de um modelo com prioridades diferentes para ter fallback automático caso um falhe.

## Estrutura

```
th-ia/
  backend/
    src/
      config/        # env, mysql, redis
      controllers/    # auth, license, admin
      services/       # auth, license (keys), aiRouter (multi-IA)
      middlewares/     # authGuard, adminGuard, rate limit do FREE
      routes/          # auth, license, admin, chat
      sockets/         # chat.socket.ts (streaming em tempo real)
      database/        # schema.sql + migrate.ts
  frontend/
    src/
      app/            # Next.js App Router
      components/      # Sidebar, PremiumModal
      lib/             # cliente da API
  docker-compose.yml
```
