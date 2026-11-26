# Black Friday DivaFit · 26/11/2026

- Novas compras entre 27/11 às 00h e 01/12 às 00h, horário de Brasília. O servidor bloqueia novos links fora da janela e limita a validade até o encerramento. Pedidos existentes continuam consultáveis e confirmáveis.
- Mensal R$ 157,60. Trimestral 3 meses sem bônus, R$ 384,15 cartão e R$ 360,00 Pix. A migração conserva pedidos antigos de 4 meses e registra os novos trimestrais com 3 meses.
- E-mail 2 usa a oferta aprovada durante a janela. Fora dela, envia apenas a avaliação e o e-book. Nenhum link do Desafio sai nesse e-mail. Produção ainda usa a função v35 até publicação autorizada.
- Desafio de 4 a 24/01/2027, página com vendas fechadas. A oferta externa da InfinitePay requer ação separada e autorização.
- A prévia do checkout mostra os valores com dados locais e bloqueia a criação de pedidos. Os testes do servidor simulam banco, Turnstile e InfinitePay. Nenhum pagamento real.
- Produção exige autorização específica para migração, funções e frontend. Reimplantar a avaliação a partir do bundle atual v35, com a troca do template e inclusão de avaliacao/black-consultoria.mjs, preservando os restantes arquivos e configurações. Publicar a migração de checkout antes da função, e a interface somente após validar a cotação da função atualizada.
- Destino previsto do Direct: https://app.leeleo.com.br/checkout/divafit/ após liberar e verificar a produção.
