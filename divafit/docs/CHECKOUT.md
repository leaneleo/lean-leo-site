# Checkout DIVAFIT — revisão antes da abertura

Oferta informada:
- Mensal: R$ 157,60 por 1 mês.
- Trimestral: R$ 384,15 como valor base no cartão ou R$ 360,00 no Pix; 3 meses + 1 mês de bônus.
- Parcelas e total final são apresentados pela InfinitePay. A integração não envia assured_installments nem altera quem absorve taxas.
- Pagamentos avulsos; nenhuma assinatura automática foi configurada.

## Estado conferido em 11/11/2026
- A API publicada respondeu enabled=false para os dois planos, com terms_version=rascunho.
- Código e banco utilizam os valores acima.
- O acesso ao Chrome não respondeu; conta recebedora, InfiniteTag e configuração atual da conta não foram reconferidas.
- Nenhuma credencial foi criada, nenhum segredo foi escrito e nenhuma cobrança ou transferência foi realizada.
- Esta revisão fica em branch separada, sem merge, PR ou deploy. O site publicado e a Edge Function publicada não recebem estas alterações automaticamente.

## Documentação oficial verificada
https://www.infinitepay.io/checkout-documentacao
- links: POST https://api.checkout.infinitepay.io/links
- payment_check: POST https://api.checkout.infinitepay.io/payment_check
- webhook: {url, events} é o formato atual documentado; manter os eventos paid, refunded e canceled.
- options exige API Key no header X-Api-Key, somente no servidor.
- Chave e InfiniteTag enviadas juntas precisam identificar a mesma conta.
- Criação básica por InfiniteTag é possível, mas não substitui a chave nesta implementação: desconto Pix, pagamento único e validade usam options.
- Não clicar em Testar API: ele pode criar um link real.
- Eventos sem assinatura não bastam para confirmar pagamento ou aplicar estorno.

## Alterações preparadas nesta revisão
- Removida a promessa de devolução em 30 dias e preços anteriores riscados que não foram aprovados na oferta atual.
- Inclusa exigência CHECKOUT_RECEIVER_VERIFIED=true, além de termos aprovados/versionados e Turnstile completo, para abrir vendas.
- Fechar novas vendas não interrompe consulta de status nem confirmação de pedidos existentes quando a conta recebedora já está verificada e as credenciais estão disponíveis.
- Preços, bônus, cupons, identidade visual e regras de taxas preservados.
- Testes com provedor e banco simulados; nenhuma chamada real de criação de link ou pagamento.

## Próximos passos operacionais

1. Na aba autenticada InfinitePay, conferir o nome do titular e a InfiniteTag exibidos; confirmar com o responsável que esta é a conta recebedora da oferta.
2. Abrir Checkout > Configurações e apenas ler Habilitar Checkout Integrado, meios de pagamento e taxas. Não alterar configurações da conta.
3. Inspecionar API Keys sem revelar valores. Se não houver chave adequada, explicar que ela permitirá opções do link e consultas pelo servidor e obter confirmação específica antes de gerar. Não copiar para chat, GitHub, config.js, logs ou arquivos públicos.
4. Abrir https://supabase.com/dashboard/project/ycchdswqaekdupmrnszz/functions/secrets e configurar somente no servidor:
   - INFINITEPAY_HANDLE: InfiniteTag conferida, sem $.
   - INFINITEPAY_API_KEY: chave da mesma conta.
   - TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY: widget autorizado para app.leeleo.com.br e outros domínios efetivamente usados. Criação de credencial depende de confirmação.
   - CHECKOUT_RECEIVER_VERIFIED=true somente após conferência da conta.
   - CHECKOUT_ENABLED=false e CHECKOUT_TERMS_APPROVED=false devem permanecer até aprovação da oferta e dos testes.
   - CHECKOUT_TERMS_VERSION=rascunho enquanto os termos estiverem incompletos.
   Os segredos das Edge Functions não são os segredos do Postgres Vault. Uma busca vazia no Vault não prova ausência de segredos no ambiente das funções.
5. Finalizar, com dados confirmados pelo responsável, identificação do fornecedor, canal de contato, privacidade, início do acompanhamento, entrega e regras de cancelamento/reembolso. Não criar garantia comercial nem inferir dados da empresa. Revisar também as promessas existentes de revisão mensal, WhatsApp e materiais complementares.
6. Após revisão, solicitar aprovação específica para publicar o frontend e a função. A branch codex/divafit-gestao-inicial serve o app e pode disparar deploy; não fazer merge nem push nela sem aprovação.
7. Validar cálculo exato do desconto Pix e total no cartão na InfinitePay. Sem autorização para criar link/cobrança real, a validação com o provedor permanece pendente. Simulações não comprovam aceitação da chave, arredondamento ou entrega real do webhook.
8. Somente após todas as aprovações e verificações: definir versão final dos termos, CHECKOUT_TERMS_APPROVED=true e CHECKOUT_ENABLED=true. Isso é uma etapa posterior; esta revisão não ativa vendas.

## Confirmação e entrada da aluna
- Pedido real e valores persistidos são conferidos por payment_check; parâmetros do retorno ou webhook isolado não liberam acompanhamento.
- A rotina existente registra pagamento e tarefa de entrada no banco; reenvio é tratado pela rotina de confirmação persistida.
- Estornos/cancelamentos exigem revisão no provedor.
- WhatsApp oficial e alterações na MFIT continuam sem automação nesta revisão. Nenhuma mensagem é enviada.

