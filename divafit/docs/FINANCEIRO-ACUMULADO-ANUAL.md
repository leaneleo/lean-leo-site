# Entrada do Financeiro: acumulado anual

Os três cartões principais usam o faturamento do ano selecionado até a data atual em São Paulo. A pizza e seu total usam o mesmo conjunto de registros. Os doze cartões inferiores continuam com os totais mensais combinados, sem alteração de cálculo. Valores e lançamentos permanecem preservados.

Validação: 14 testes de financeiro passaram, incluindo exclusão de datas futuras e preservação da série mensal. Sintaxe e build passaram.

Publicado no commit 336c01fe6205b0d8e4c9bf12cd61b6cbaa80f7c3. Deploy de produção pronto. Os dois módulos servidos pelo endereço do app foram comparados byte a byte com os arquivos testados: idênticos. Conferência DOM adicional confirmou os três cartões anuais, a pizza combinada e a preservação dos doze totais mensais.
