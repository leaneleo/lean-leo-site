# Black Friday DivaFit · 26/11/2026

- Novas compras entre 27/11 às 00h e 01/12 às 00h, horário de Brasília. O servidor bloqueia novos links fora da janela e limita a validade até o encerramento. Pedidos existentes continuam consultáveis e confirmáveis.
- Mensal R$ 157,60. Trimestral 3 meses sem bônus, R$ 384,15 cartão e R$ 360,00 Pix. A migração conserva pedidos antigos de 4 meses e registra os novos trimestrais com 3 meses.
- E-mail 2 usa a oferta aprovada durante a janela. Fora dela, envia apenas a avaliação e o e-book. Nenhum link do Desafio sai nesse e-mail. Produção ainda usa a função v35 até publicação autorizada.
- Desafio de 4 a 24/01/2027, página com vendas fechadas. A oferta externa da InfinitePay requer ação separada e autorização.
- A prévia do checkout mostra os valores com dados locais e bloqueia a criação de pedidos. Os testes do servidor simulam banco, Turnstile e InfinitePay. Nenhum pagamento real.
- Produção exige autorização específica para migração, funções e frontend. Reimplantar a avaliação a partir do bundle atual v35, com a troca do template e inclusão de avaliacao/black-consultoria.mjs, preservando os restantes arquivos e configurações. Publicar a migração de checkout antes da função, e a interface somente após validar a cotação da função atualizada.
- Destino previsto do Direct: https://app.leeleo.com.br/checkout/divafit/ após liberar e verificar a produção.

## Liberação pelo Leandro

Uma autorização no chat basta: “Autorizo publicar a Black DivaFit e liberar o checkout agora. Pode aplicar a migração testada, publicar a função e a página e me mandar o link do Direct. Encerrar em 30/11 às 23h59, horário de Brasília.” Enviar o comando quando for divulgar o primeiro Reel, a partir de 27/11. Conferir cotação e proteções depois da publicação, sem pagamento real. Se a configuração vigente não habilitar o checkout, liberar o controle de vendas pelo procedimento autorizado e revalidar.

A lista de espera e o texto do E-mail 2 só entram na produção depois da aprovação do card z6NK6qcH. São uma revisão separada. Na prévia, o formulário valida campos localmente e informa o resultado de simulação. No ambiente publicado, o formulário exige Turnstile, grava via função privada com credencial de serviço e deduplica e-mail normalizado na campanha. Para a função de entrada pública, configurar verify_jwt=false e preservar validação de origem e Turnstile no código. A checagem isolada do banco usa dados fictícios, sem registros de produção. A InfinitePay do Desafio e anúncios ficam sujeitos a autorizações próprias.

Validação em PostgreSQL isolado: Pix e cartão trimestrais, mensal, pedido trimestral anterior, confirmação idempotente, inscrição com etiqueta e deduplicação. Cotação de produção antes da liberação: ainda habilitada e com 4 meses. Não divulgar o link enquanto essa cotação não mudar para 3 meses.
