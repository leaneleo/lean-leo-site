# Financeiro familiar — em revisão

Pedido de Leandro em 19/11/2026: três cards (Consultoria Online DivaFit, Personal Leandro Romachelli e Personal Leonardo Landim), mês/ano, receitas confirmadas, aulas realizadas, despesas e consolidado por aluno/plano. Plano compartilhado conta uma vez.

Aula usa a tarifa válida na data e preserva esse valor. Recebimento é um lançamento separado. Há confirmação, prevenção de repetição e cancelamento com histórico. O texto `Hoje nome do aluno treinou` preenche uma aula quando o nome é único dentro do personal selecionado; ainda exige confirmação. `com L` e nomes ambíguos não são interpretados por suposição. Sem mensagens, cobranças externas ou IA paga.

Dados em `private`, RLS negando acesso direto, funções exigindo administrador real da equipe. Na leitura do banco atual, Leandro é administrador, Elisângela é treinadora e Leonardo não tem conta cadastrada. O card dele não exige criar usuário; acesso próprio é uma etapa separada.

**Código não publicado, migração não aplicada e dados não importados para produção.** A revisão automática rejeitou a aplicação de `supabase/financeiro.sql` por exigir aprovação explícita para alteração persistente de produção. Não aplicar por outro caminho sem resolver a aprovação.

## Validação

- 67 testes Node aprovados; build e verificação de sintaxe aprovados.
- PostgreSQL isolado: autorização, RLS, preços por data, centavos, repetição, conflitos e cancelamento com histórico.
- DOM simulado: três cards, texto para aula, confirmação, soma e limpeza/bloqueio ao perder acesso.
- Chromium local não iniciou por restrição de socket do ambiente. Não houve teste visual nem teste autenticado das novas telas no site real.

Testes adicionais: `scripts/test-finance-sql.mjs` (PGlite 0.5.16 via PGLITE_MODULE_PATH) e `scripts/test-finance-dom.mjs` (JSDOM 26.1.0 via JSDOM_MODULE_PATH), instalados somente no ambiente temporário. Nenhuma nova dependência do aplicativo.

## Importação pendente

Leandro confirmou que a planilha localizada no Drive pertence a ele. O original não foi modificado. `scripts/import-finance.py original.xlsx /pasta/privada/importacao.json` extrai valores, fórmulas e referências sem executar fórmulas. O JSON contém dados financeiros reais: nunca versionar, publicar ou incluir em fixtures.

`scripts/prepare-finance-import.py importacao.json UUID_DO_ADMIN /pasta/privada/importacao.sql` prepara SQL transacional para revisão, verifica o administrador e evita repetir chaves de origem. Não executa SQL. O arquivo gerado contém dados privados e deve ficar fora do repositório.

A extração encontrou dados sem tarifa, diferença de fechamento e uma aba com data-base divergente. Essas aulas não podem ser confirmadas por suposição. Abas anuais devem ser preservadas como fontes privadas; investimentos, saldos e dívidas não são renda. Consultoria já paga não deve ser duplicada pelos mesmos registros do Excel. **A substituição integral da planilha ainda não está concluída.**

Após aprovação: aplicar somente a migração no banco DivaFit `ycchdswqaekdupmrnszz`, revisar/importar as fontes privadas, publicar no projeto Netlify `consultoria-divafit`, conferir totais e bloqueio da treinadora. O site institucional usa main; o DivaFit atual foi identificado no commit `ffc99443c0aace618b3746c635a1001612d277ee`, branch `codex/divafit-gestao-inicial`. Não publicar essas alterações na main institucional.
