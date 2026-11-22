## Leitura do IMC e conclusão do funil

- Corrige a largura do cartão de fotos, adiciona duas leituras em cada faixa de IMC e separa o envio da avaliação por e-mail da oferta do Desafio sem fotos.

## Metas independentes na avaliação

- Calcula perda de gordura e ganho muscular separadamente. Tela e e-mail exibem apenas prazos aplicáveis e escolhem a mensagem pelos resultados.

## Objetivo na avaliação

- Adiciona três objetivos ao funil e reproduz as metas e mensagens da planilha na tela e no e-mail.

## Prévia de avaliação, Biblioteca e Financeiro

- Avaliação compacta, total e siglas na Biblioteca, renda familiar anual e Desafio Black com visual escuro. E-mail de teste protegido por lista de destinatários.

## Card Desafio Black — 21/11/2026

- Financeiro mostra tema, datas, dieta em grupo e vendas fechadas, com link para a página do Desafio. Os dois pontos leem as mesmas informações.

## Homologação da análise pública

- Prévia aponta para a função do Supabase com passe de teste de uso único. Envio Resend preparado e desativado por padrão.

## Funil público de fotos — 21/11/2026

- Fluxo opcional de fotos com função pública independente, Turnstile, limite diário e deduplicação por contato. Desafio disponível na prévia e com vendas fechadas.

## 2026-11-21

- Funil de avaliação com contatos reunidos, espaçamento mobile, aviso com o número da LGPD e demonstração da composição corporal com fórmulas da planilha.

## 2026-11-20

- Biblioteca com total e filtros pelas siglas oficiais, Visão Geral com sete dias para alunos novos e revisão dos textos de rotinas. Cálculos acessíveis pelo atendimento.

# Histórico DivaFit

## CRM, Família e relatórios InfinitePay — 20/11/2026

- Aba CRM (administradores): situação de cada aluna (cobrar, devendo treino, renovar/prorrogar, em preparo, em dia, reativar), prorrogação de R$ 20 em um clique (fica Pendente), custo estimado de prescrição (R$ 50 por treino novo) e funil de leads com alertas de follow-up e atalho de WhatsApp sem envio automático.
- Financeiro ganhou o card Família: entradas x saídas, saldo, ranking de gastos por categoria e lançamento rápido de gastos.
- Relatórios InfinitePay 2024–2026 aparecem no card Le&LeoFit, sem somar duas vezes pagamentos do mesmo período. Detalhes em docs/CRM-FAMILIA.md.

## Pessoas e famílias confirmadas — 19/11/2026

- Configuração privada ditada por Leandro: pessoas separadas dos responsáveis por cobrança e regras automáticas por família. Laboral fica no teclado e fora da contagem de alunos; nomes que deixaram de treinar saem da lista principal.
- Fechamento distingue as pessoas de cada composição. Atualização automática fica pausada na calculadora para não apagar a seleção durante o preenchimento.
- Valores novos com vigência a partir de 19/11, somente para próximos registros. Todos os lançamentos anteriores preservados e comparados por hash. Nenhum recálculo de outros meses.

## Calculadora de atendimentos — 19/11/2026

- Botões com nomes, visor animado, + para dupla/trio, limpar, desfazer e = Registrar no dia escolhido. Grupos exigem tarifa cadastrada; combinações já registradas reutilizam a modalidade, respeitando a vigência.
- Retirada a contagem estimada de 20 ativos: ela confundia modalidades e atividade recente com pessoas. A planilha não define status ativo; o cartão indica A confirmar.
- Histórico importado e valores preservados. Sem mensagens enviadas.


## Painel anual, produtos e fechamentos — 19/11/2026

- Pizza anual, destaque do ano, três cards e meses abaixo; páginas exclusivas e botão Voltar. Marca online Le&LeoFit e nome Leandro Romacheli corrigidos.
- Agenda semanal, registro em lote/grupo por tarifa cadastrada, reajustes por vigência e tratamentos da planilha com saudação pelo horário.
- Catálogo privado editável e preparação mensal de rascunhos, sem WhatsApp.
- Integração InfinitePay do Claude preservada integralmente; presencial só contabilizado. Importação do histórico externo online ainda depende dos relatórios.
- 78 testes Node da versão integrada, banco isolado e DOM aprovados. Detalhes em docs/FINANCEIRO-PAINEL.md.

- Publicado no Netlify (c0f2940); conferidos autenticado gráfico, 12 meses, páginas, catálogo e prévia sem salvar dados fictícios. Console sem erros.

## Financeiro familiar — 19/11/2026, ativado após autorização

- Três cards de renda, mês/ano, aulas e recebimentos separados, despesas e consolidado por aluno/plano.
- Registro de aula pelo formulário ou preenchimento por texto, com confirmação e tarifa histórica.
- Migração privada com RLS, administrador verificado, idempotência e cancelamento com histórico.
- Extração de Excel e preparação de SQL privado sem execução. Dados reais não versionados.
- 67 testes Node, banco isolado e DOM aprovados. Build aprovado; teste visual bloqueado pelo ambiente.
- Após autorização explícita de Leandro: migração aplicada no banco DivaFit, importação privada conferida e publicação confirmada no Netlify. Teste transacional real confirmou cálculo/cancelamento e bloqueio da treinadora, com rollback dos testes. Dados desconhecidos continuam a conferir; planilha original preservada. Conferência visual autenticada em andamento.

- Conferência autenticada: cartões carregaram e totais anuais foram comparados ao banco. Filtro ganhou botão Aplicar período para aplicar ano/mês de uma vez, sem depender de sair do campo.
- Conferência final no site autenticado: totais mensais/anuais comparados ao banco, troca de ano pelo botão Aplicar período e preenchimento por texto com tarifa correta; nenhum lançamento fictício salvo.

## 2026-11-21

- Referência de métodos em três colunas e proposta de VSSAM semanal documentada.

- Financeiro → Le&LeoFit recebeu o cartão Black Friday do Desafio Black. Os cards de Instruções mostram somente observações, e a Biblioteca aceita AA9 e superiores.

## Avaliação corporal por fotos — branch de trabalho

- Fluxo de equipe com consentimento, fotos privadas, rascunho de IA, revisão, histórico e impressão de aprovados. Veja docs/ANALISE-CORPORAL.md.

- Funil de avaliação parcial e página fechada do Desafio 21 dias disponíveis para revisão. Consulte docs/FUNIL-AVALIACAO.md.
