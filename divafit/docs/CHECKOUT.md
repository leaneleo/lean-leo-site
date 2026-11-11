# Checkout DIVAFIT — abertura das vendas

Prévia: https://app.leeleo.com.br/checkout/divafit/

Parcelamento: mostrar o cálculo e total da InfinitePay, sem garantir 3 parcelas fixas nem alterar quem absorve as taxas.

Antes de ativar:
- Conferir InfiniteTag e chave API da conta recebedora em segredo no Supabase (INFINITEPAY_HANDLE e INFINITEPAY_API_KEY). Nunca colocar em código público.
- Configurar TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY para os domínios oficiais.
- Finalizar termos, identificação do fornecedor, privacidade, contato e condições da garantia; definir CHECKOUT_TERMS_VERSION.
- Conferir descontos e taxas na conta InfinitePay. Validar arredondamento Pix e nomes dos campos com transação real autorizada; não existe ambiente de testes do provedor.
- Só então definir CHECKOUT_TERMS_APPROVED=true e CHECKOUT_ENABLED=true.

Pagamentos só são confirmados após consulta payment_check ao provedor. A URL de retorno e o webhook sem assinatura não bastam. Estornos/cancelamentos exigem revisão no provedor. Correspondências ambíguas de aluno ficam para revisão administrativa.

O financeiro mostra os pedidos. A confirmação cria uma tarefa de entrada no banco; falta apresentar e concluir esse acompanhamento pela equipe. WhatsApp oficial e alterações na MFIT não estão automatizados nesta entrega. Não há mensagem enviada nem cobrança criada na prévia.

Validação: 62 testes locais; confirmação repetida verificada no banco dentro de transação descartada; permissões impedem confirmação direta por visitante ou usuário autenticado.
