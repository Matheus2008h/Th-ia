export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TH IA (TH-5.5) API',
    version: '1.0.0',
    description:
      'API da plataforma TH IA. Rotas /api/* exigem login de usuário (JWT) ou de admin, exceto onde indicado. Rotas /api/v1/* são a API pública, autenticadas por API key mensal (Authorization: Bearer <key>).',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKeyAuth: { type: 'http', scheme: 'bearer', description: 'API key mensal gerada pelo admin' },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Criar conta (plano FREE automático)',
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } }, required: ['name', 'email', 'password'] } } },
        },
        responses: { '201': { description: 'Conta criada, tokens retornados' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login (pode retornar desafio de 2FA)',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { '200': { description: 'Tokens ou { requiresTwoFactor, challengeToken }' } },
      },
    },
    '/auth/2fa/verify-login': {
      post: { summary: 'Segunda etapa do login com 2FA ativado', responses: { '200': { description: 'Tokens' } } },
    },
    '/license/purchase-info': {
      get: { summary: 'Preço e link do WhatsApp para comprar Premium', responses: { '200': { description: 'OK' } } },
    },
    '/license/activate': {
      post: { summary: 'Ativa uma key Premium na conta logada', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Premium ativado' } } },
    },
    '/chat/conversations': {
      get: { summary: 'Lista conversas do usuário', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
      post: { summary: 'Cria nova conversa', security: [{ bearerAuth: [] }], responses: { '201': { description: 'OK' } } },
    },
    '/upload': {
      post: { summary: 'Upload de arquivo (extrai texto/OCR quando aplicável)', security: [{ bearerAuth: [] }], responses: { '201': { description: 'OK' } } },
    },
    '/image/generate': {
      post: { summary: 'Gera imagem por texto', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/image/edit': {
      post: { summary: 'Edita imagem (remover objeto, trocar fundo, upscale, restaurar)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/tools/calculator': {
      post: { summary: 'Calculadora', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/tools/search': {
      post: { summary: 'Pesquisa na internet', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/user/profile': {
      get: { summary: 'Perfil do usuário (nome, idioma, estilo, personalidade)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
      put: { summary: 'Atualiza perfil', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/user/memory': {
      get: { summary: 'Lista fatos de memória longa', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
      post: { summary: 'Salva um fato de memória', security: [{ bearerAuth: [] }], responses: { '201': { description: 'OK' } } },
    },
    '/user/2fa/setup': {
      post: { summary: 'Gera QR code para ativar 2FA', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/user/2fa/confirm': {
      post: { summary: 'Confirma o código e ativa o 2FA', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/admin/stats': {
      get: { summary: '[Admin] Estatísticas gerais', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' }, '403': { description: 'Acesso negado (não-admin)' } } },
    },
    '/admin/keys': {
      post: { summary: '[Admin] Gerar key Premium', security: [{ bearerAuth: [] }], responses: { '201': { description: 'OK' } } },
      get: { summary: '[Admin] Listar keys Premium', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/admin/api-keys': {
      post: { summary: '[Admin] Gerar API key mensal (ativa por 30 dias)', security: [{ bearerAuth: [] }], responses: { '201': { description: 'OK' } } },
      get: { summary: '[Admin] Listar API keys mensais', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/admin/providers': {
      post: { summary: '[Admin] Cadastrar provedor de IA', security: [{ bearerAuth: [] }], responses: { '201': { description: 'OK' } } },
      get: { summary: '[Admin] Listar provedores', security: [{ bearerAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
    '/v1/chat/completions': {
      post: {
        summary: '[API pública] Chat completions (formato OpenAI)',
        security: [{ apiKeyAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { messages: { type: 'array' }, stream: { type: 'boolean' } } } } } },
        responses: { '200': { description: 'OK' }, '401': { description: 'API key ausente, inválida ou expirada' } },
      },
    },
    '/v1/images/generations': {
      post: { summary: '[API pública] Geração de imagem (formato OpenAI)', security: [{ apiKeyAuth: [] }], responses: { '200': { description: 'OK' } } },
    },
  },
};
