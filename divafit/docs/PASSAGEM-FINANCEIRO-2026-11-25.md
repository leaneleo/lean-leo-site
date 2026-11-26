# Passagem — ajustes financeiros

## Feito
- Lista diária exclui cancelados e arquivados. O cancelamento continua preservado no banco e recarrega os registros após salvar.
- Relatórios privados de faturamento mensal por personal usam kind=recebimento e source.type=personal_monthly_revenue, com source.month no formato YYYY-MM. O total mensal substitui a soma monetária das aulas do mesmo personal/mês; a quantidade permanece baseada apenas nas aulas reais.
- Lançamentos solicitados foram gravados e relidos no banco privado, apenas no personal indicado e nos meses encerrados solicitados. Nenhum valor confidencial consta neste arquivo. Novembro não recebeu lançamento.

## Validação
- 24/24 testes de financeiro e CRM passaram, incluindo relatório mensal, contagem, cancelado, arquivado e mês sem relatório.
- Bateria completa: 92/93 passaram. Falha preexistente em copy-summary.test.mjs (nome padronizado); reproduzida no HEAD original a0a9aa6 em worktree separado.
- Sintaxe e build passaram. Navegador local não executou: instalação Chromium incompleta. Conferência visual no app publicado permanece pendente.

## Publicação aprovada e concluída
- Leandro autorizou a publicação nesta conversa. Commit 52a87ff0768d38ad1aa04dce61aa9696f1250a2b publicado em produção em 25/11/2026 (São Paulo).
- Netlify confirmou deploy 6b078138e5fd2e8906af6c7b como atual e pronto.
- Os dois módulos servidos em app.leeleo.com.br foram comparados byte a byte com os arquivos testados: idênticos.

## Falta
- Conferência visual autenticada da agenda e do painel do personal; não houve sessão autenticada disponível para essa validação.
