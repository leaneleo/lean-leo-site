# Financeiro — painel anual e páginas próprias

Atualizado em 19/11/2026. Continuação autorizada por Leandro depois do primeiro financeiro.

## Visão geral

Título Financeiro, subtítulo Renda online e presencial e data do aplicativo preservada. Pizza anual por Le&LeoFit, Personal Leandro Romacheli e Personal Leonardo Landim, tag do ano, acumulado, três cards clicáveis e doze cards mensais abaixo. Sem valores a receber e sem filtros permanentes no topo. A tag permite escolher outro ano.

O faturamento do painel soma as aulas presenciais realizadas com tarifa identificada e as vendas online confirmadas. Recebimentos das mesmas aulas não são somados outra vez. O principal da venda online não é confundido com juros pagos pelo comprador nem com líquido recebido. Valores desconhecidos ficam fora dos totais, com indicação de pendência. O gráfico não representa extrato bancário.

Os cards abrem páginas próprias, mantendo o menu principal do aplicativo. O botão interno chama-se apenas Voltar.

## Personais

Renda anual, cadastros com atividade recente, aulas e faturamento mensal. Semana de segunda a sexta, registro por texto, conferência e botão Registrar. Várias pessoas exigem distinguir aulas separadas de um atendimento em grupo. Em grupo, o administrador escolhe a tarifa cadastrada; cobra uma vez e preserva participantes. Não foi aplicada a fórmula ilustrativa de preços da conversa.

Tarifas vêm da planilha e dos cadastros. Reajustes criam vigência nova; os valores das aulas anteriores ficam congelados. O histórico do Leonardo aguarda a planilha dele. Códigos de modalidades e marcações históricas ainda podem precisar de revisão.

Fechamentos usam os tratamentos, agrupamentos de cobrança e despedidas recuperados das fórmulas da planilha. A saudação é calculada no horário de São Paulo: manhã, tarde ou noite. O texto pode ser personalizado e aprovado. Alterar o fechamento invalida a aprovação anterior. Nenhum WhatsApp é enviado.

A rotina PostgreSQL divafit-fechamentos-mensais prepara o mês anterior no dia 1 às 6h de São Paulo. É preparação de rascunhos, não envio. A geração também pode ser conferida na aba Fechamentos.

## Le&LeoFit e catálogo

Consultoria Online (mensal, trimestral, semestral), Desafio DIVAFIT, E-books, Emagreciência e Verão sem lesão. Ofertas e entregáveis editáveis, guardados em tabelas privadas. Preços existentes do checkout preservados; preços não confirmados permanecem a definir. As versões conflitantes dos materiais ficam indicadas para conferência. Nenhum livro, documento ou dado financeiro real foi copiado para o repositório público.

Editar o catálogo não altera silenciosamente o preço de um checkout já publicado. As ofertas permanecem em conferência. A conexão futura com o Studio deve consumir somente uma oferta revisada e manter os segredos no servidor.

## InfinitePay

A integração de checkout foi continuada pelo Claude. Este painel preserva integralmente os arquivos e preços dessa integração no commit b63558c. Não publica alterações da função de checkout, segredos ou condições de venda. O presencial não gera cobranças na InfinitePay; o sistema apenas contabiliza suas aulas. O histórico externo online completo depende dos relatórios de vendas de 2026, ainda não importados aqui. A confirmação dos pagamentos do checkout continua usando as rotinas existentes.

## Segurança e validação

Somente administradores acessam catálogo, contatos, tarifas, fechamentos e registros. Tabelas privadas têm RLS negando acesso direto; funções de membro verificam o administrador real. A treinadora não recebe os dados. Função de configuração do provedor é exclusiva do servidor.

Arquivos: supabase/financeiro_painel.sql, supabase/financeiro_fechamentos_cron.sql, finance-painel-data.js, finance-painel-ui.js, finance-painel.css.

Validação: 78 testes Node da versão integrada, DOM simulado do painel e PostgreSQL isolado. Cobertura inclui grupos cobrados uma vez, repetição, reajuste histórico, fecho/aprovação, saudação e bloqueio de treinadora/anônimo. A revisão automática inicialmente confundiu as restrições do Studio com este projeto; após verificar AGENTS.md do DivaFit e o banco correto, a aplicação pelo mesmo mecanismo foi autorizada. Migrações e configuração mensal foram aplicadas apenas no DivaFit.

Publicação confirmada no Netlify em 19/11 às 22h15, commit c0f2940. Conferência autenticada: gráfico, 12 meses, três páginas, catálogo e prévia de aulas com tarifas da planilha carregaram; nenhum lançamento fictício salvo. Console sem erros. O estado operacional da InfinitePay permanece conforme o trabalho separado do Claude.


## Calculadora diária

Nomes tocam para o visor; sem + são atendimentos separados. O + acrescenta uma pessoa ao último atendimento (máximo três); limpar e desfazer permitem corrigir antes de registrar. Tarifas conjuntas não são inferidas por multiplicação: seleciona-se uma modalidade cadastrada, ou reutiliza-se a escolha de uma combinação anteriormente registrada. Uma dupla/trio grava um único atendimento com participantes. Nomes já identificados nos registros do dia ficam sinalizados e bloqueados para nova seleção. Modalidades antigas não aparecem como pessoas. A conta anterior de 20 ativos foi retirada: a fonte tem códigos e agrupamentos de cobrança, sem um status ativo confiável por pessoa. O cartão mostra A confirmar. Rótulo Ellen mantém o vínculo com o cadastro Helen da planilha, conforme o nome usado por Leandro. Não altera os dados históricos.
