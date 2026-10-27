# Consultoria Online DivaFit

Aplicação de gestão independente do site institucional Lean & Leo Fit. Interface estática sem dependências de produção; dados em PostgreSQL/Supabase com autenticação e regras de acesso no banco.

## Estado da entrega

Implementados: alunos, modelos e contagem manual de novos treinos, fichas com múltiplas origens, distribuição semanal de VSSAM, validade, tarefas, planos compartilhados, pagamentos, avisos assistidos pelo WhatsApp, backup JSON e prévia de importação de alunos.

Banco Supabase criado no plano Free, em São Paulo; migrações aplicadas e permissões testadas no banco. Os e-mails da equipe ficam em uma lista privada de ativação. A interface permite ativação de conta, confirmação de e-mail e definição/redefinição de senha pelo próprio usuário. A confirmação depende da configuração do serviço de e-mail do projeto, que ainda precisa ser validada. A publicação será em um **segundo projeto** Netlify. Mfit e envio automático de WhatsApp não estão conectados. O WhatsApp abre uma conversa; confirmação manual não comprova entrega.

O site institucional existente e seu domínio não devem ser substituídos. Não é necessário alterar seu `index.html` nesta etapa. Este diretório deve ser a base de um segundo projeto Netlify. Dados reais, arquivos de alunos e credenciais administrativas nunca devem entrar no GitHub ou no diretório publicado.

## Rodar e verificar

Com Node 22 ou superior:

```sh
npm test
npm run dev
node scripts/build.mjs
```

Sem configuração, a aplicação mostra uma apresentação vazia, não uma base de alunos fictícios. Cadastros e alterações ficam bloqueados até conectar o banco e entrar com uma conta autorizada. Preferências e sessões ficam na aba do navegador; registros de negócio são salvos no banco.

## Banco e equipe

1. Criar ou selecionar projeto Supabase exclusivamente para a consultoria; não reaproveitar banco desconhecido.
2. Aplicar `supabase/migrations/001_divafit.sql` uma única vez por meio da administração. É uma transação; manter migrações aplicadas imutáveis.
3. Aplicar a migração de ativação da equipe. Inserir os dois e-mails verificados em `private.approved_team_emails`, com `admin` para Leandro e `trainer` para Elisângela. A lista não pode ser lida ou alterada pelo navegador e não é versionada com e-mails reais.
4. A criação de conta é restrita a essa lista. O gatilho só cria o vínculo em `team_members` após confirmação do e-mail; não há privilégio automático para o primeiro visitante. Cada pessoa define sua própria senha.
5. Configurar envio de e-mail e URLs de redirecionamento no Supabase Auth; validar o fluxo real de ativação das duas contas antes de importar dados. O provedor padrão do Supabase tem restrições de destinatários e pode exigir SMTP próprio para a prescritora.
6. Os testes transacionais de RLS já passaram no banco, incluindo restrição financeira, auditoria, conta sem vínculo, visitante, conflito de versão e restrição/ativação de e-mail. Todos os registros artificiais foram revertidos. O arquivo `supabase/tests/access.sql` documenta a estratégia de verificação.

O financeiro tem políticas exclusivamente para `admin`. A consulta da equipe retorna só o próprio vínculo. O navegador não tem permissão para criar ou alterar membros, apagar registros ou alterar o log de auditoria. Modificações geram autor, data e versão; atualizações usam comparação de versão para evitar perda silenciosa de edições simultâneas.

A interface atualiza os dados a cada 60 segundos quando a aba está visível. A atualização é suspensa enquanto houver formulário aberto, operação em andamento ou prévia de importação em revisão.

## Netlify

Criar um novo projeto Netlify conectado ao mesmo repositório, apontando a pasta base para `divafit`. Na cópia local, este diretório é o próprio projeto.

- Comando: `node scripts/build.mjs`
- Diretório publicado: `public` (relativo à pasta base)
- Variáveis: `DIVAFIT_SUPABASE_URL` e `DIVAFIT_SUPABASE_PUBLIC_KEY`
- Use somente a chave pública anon/publishable. Nunca `service_role` ou `sb_secret_`.
- HTTPS e proteção de dados dependem também de aplicar corretamente as políticas do banco.
- Definir o endereço do projeto no Supabase Auth. Validar entrada/saída e recuperação de senha.
- Depois de testar o endereço `.netlify.app`, configurar `consultoria.leaneleo.com.br` no novo projeto e o registro DNS no provedor atual; preservar os registros existentes de site e e-mail.
- O botão no site institucional só deve ser adicionado após haver uma URL de destino funcional.

Em desenvolvimento, copiar `config.example.js` para `config.js` e preencher somente dados públicos de conexão. O arquivo é ignorado no Git. O build gera configuração a partir das variáveis do Netlify.

## Migração dos controles

Começar com importação de alunos via JSON no formato `{ "students": [{ "name": "...", "source_url": "..." }] }`, revisada pelo administrador. A aplicação ignora nomes idênticos já cadastrados e marca os novos como “A revisar”. Isso não resolve homônimos nem abreviações: devem ser reconciliados antes de importar.

A importação completa de fichas e pagamentos dos documentos Word ainda requer extrair suas tabelas, reconciliar divergências e validar uma amostra com o responsável. Não preencher valores financeiros ausentes, consentimento ou classificações por inferência. O arquivo de backup completo ainda não possui um restaurador automático; a importação de alunos não restaura fichas/pagamentos.

VSSAM representa as séries informadas por grupo muscular em cada dia da semana. A soma não é multiplicada novamente pela frequência. Não há classificação científica automática nem cálculo de gasto calórico nesta versão.

## Antes de colocar dados reais

- Testar consultas e alterações como Leandro, Elisângela, visitante sem login e conta sem vínculo.
- Confirmar que Elisângela não lê pagamentos nem histórico de auditoria.
- Validar cópia idêntica, adaptação contada como nova e mix de múltiplas origens.
- Validar conflito de edição em duas sessões.
- Ensaiar backup, importar uma amostra e conferir contagens.
- Testar os lembretes na virada do dia de São Paulo, substituição/prorrogação e cancelamento de consentimento.

O envio automático futuro precisará da WhatsApp Business Platform, modelos aprovados, consentimento, fila idempotente e confirmação de entrega por webhook. Nenhum envio automático está habilitado neste código.
