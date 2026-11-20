# CRM, Família e relatórios InfinitePay — 20/11/2026

Pedido de Leandro em 20/11/2026 ("pode montar tudo já"), feito pelo Claude.

## CRM (aba nova, só administradores)

- **Situação das alunas**: cruza alunos, pagamentos e fichas. Cada aluna recebe uma situação:
  Cobrar (pagamento Pendente ou vencido) · Devendo treino (ficha acaba em até 7 dias e o plano ainda tem treino a entregar)
  · Renovar ou prorrogar · Treino em preparo (ficha Em elaboração) · Em dia · Conferir dados (ficha sem data final)
  · Reativar (ficha terminou há mais de 30 dias) · Sem ficha. Encerradas e arquivadas ficam fora.
- **Planos** (texto livre do pagamento): Mensal = 1 treino; Trimestral = 3 meses + 1 de bônus = 4 treinos;
  Prorrogação = R$ 20 para manter o mesmo treino por mais 1 mês (não é plano novo nem treino novo); demais = a conferir.
  Treinos entregues = fichas iniciadas desde o início do plano, sem contar cópias "Igual".
- **Registrar prorrogação (R$ 20)**: cria um pagamento "Prorrogação" Pendente por 1 mês a partir do fim da ficha atual.
  Marcar como pago continua no Financeiro.
- **Prescrição no mês (estimado)**: fichas novas iniciadas no mês × R$ 50 (Elisângela). Estimativa; o pagamento real
  pode ser lançado na Família na categoria "Equipe (Elisângela)".
- **Funil de leads**: Novos → Conversando → Link enviado → Comprou / Perdido. Origem, interesse, responsável
  (Leandro/Leonardo), próximo contato, último contato, observações, vínculo com a aluna ao comprar, arquivar.
  Alertas: follow-up atrasado, falar hoje, parado há mais de 3 dias. Botão WhatsApp só abre a conversa — nada é enviado sozinho.

## Família (card novo no Financeiro)

- Entradas = faturamento registrado (aulas Leandro + Leonardo + Le&LeoFit). Saídas = gastos lançados com categoria.
- Saldo do mês e do ano, ranking "onde o dinheiro foi" (mês e ano), lançar gasto, cancelar com histórico, tabela mês a mês.
- Não é extrato bancário e não mistura CPF/CNPJ: é a visão da casa.

## Relatórios InfinitePay (consultoria online)

- Relatórios de vendas da conta InfinitePay (no nome do Leonardo) importados como lançamentos mensais `recebimento`,
  divisão Leandro, `source.rotulo = "Faturamento Le&LeoFit"`, com período coberto (`cobertura_inicio`/`cobertura_fim`).
  Origem registrada em `finance_sources` (`infinitepay:*`, sha256 dos PDFs). Venda de teste do checkout (Pix R$ 78,80, 19/11/2026) descontada.
- O painel soma esses lançamentos no card Le&LeoFit e **não soma de novo** pagamentos Pagos com data dentro do período coberto.
  Novos relatórios: importar com o mesmo rótulo e cobertura.

## Banco

`supabase/crm_familia.sql` (aplicado no DivaFit `ycchdswqaekdupmrnszz` como migração `divafit_crm_familia`):
`private.crm_leads` (RLS negando acesso direto, stamp/audit), `crm_leads()`, `crm_lead_save()`, `crm_lead_archive()`,
coluna `finance_entries.category`, `finance_expense_create()`. Todas exigem administrador real. Testado antes em transação desfeita.

## Validação

`npm test` (92 testes, incluindo `tests/crm.test.mjs`), build, e fotos de tela em computador (1400px) e celular (390px)
com dados fictícios carregando os módulos reais.

## Pendências

- Leonardo: cadastrar alunos e valor da aula dele (página Personal Leonardo já existe) e criar o acesso dele (e-mail).
- Pagamentos antigos estão quase todos "A revisar" e sem datas; enquanto isso muitas alunas aparecem como "Plano a conferir".
