# Passagem — ajustes financeiros

## Feito
- Lista diária exclui cancelados e arquivados. O cancelamento continua preservado no banco e recarrega os registros após salvar.
- Relatórios privados de faturamento mensal por personal usam kind=recebimento e source.type=personal_monthly_revenue, com source.month no formato YYYY-MM. O total mensal substitui a soma monetária das aulas do mesmo personal/mês; a quantidade permanece baseada apenas nas aulas reais.
- Lançamentos solicitados foram gravados e relidos no banco privado, apenas no personal indicado e nos meses encerrados solicitados. Nenhum valor confidencial consta neste arquivo. Novembro não recebeu lançamento.

## Validação
- 24/24 testes de financeiro e CRM passaram, incluindo relatório mensal, contagem, cancelado, arquivado e mês sem relatório.
- Bateria completa: 92/93 passaram. Falha preexistente em copy-summary.test.mjs (nome padronizado); reproduzida no HEAD original a0a9aa6 em worktree separado.
- Sintaxe e build passaram. Navegador local não executou: instalação Chromium incompleta. Conferência visual no app publicado permanece pendente.

## Falta
- Aprovação de Leandro para publicar a alteração de interface e cálculo. Até publicar, o painel antigo ainda não interpreta os relatórios mensais registrados.
- Após publicação: conferir cancelamento na agenda e relatórios mensais na página do personal.
