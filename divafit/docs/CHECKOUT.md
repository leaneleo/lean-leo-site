# Checkout DIVAFIT — revisão antes da abertura

## Decisões do Leandro em 19/11/2026 (aplicadas pelo Claude na branch claude/checkout-abertura)
- Conta recebedora: InfiniteTag `romeland`, confirmada pelo Leandro. Checkout Integrado ligado; API Key criada e salva por ele.
- Segredos já salvos na Edge Function (19/11, 15h30): INFINITEPAY_API_KEY, INFINITEPAY_HANDLE=romeland, CHECKOUT_RECEIVER_VERIFIED=true, CHECKOUT_ENABLED=false, CHECKOUT_TERMS_APPROVED=false, CHECKOUT_TERMS_VERSION=rascunho.
- Taxa do parcelamento: paga pela cliente em todas as parcelas (`options.assured_installments: 0`).
- Preços riscados de referência voltam (R$ 197,00 e R$ 591,00), conforme o plano mestre.
- (substituído em 19/11 21h50, ver abaixo) Garantia de 30 dias com condições escritas (seguir o programa = formulário + fotos, 75% dos treinos, registro no MFIT, reavaliação; pedido até o 37º dia; devolução em até 7 dias úteis; não substitui o art. 49 do CDC). Texto na página **aprovado pelo Leandro em 19/11, 15h40**.
- Vendedor: 66.715.938 LEANDRO DE AMORIM ROMACHELI (MEI), CNPJ 66.715.938/0001-04, Rua C20, 75, Jardim América, Goiânia-GO, 74265-100.
- Urgência só verdadeira: 10 vagas por mês, contando apenas pagamentos confirmados no mês (fuso de São Paulo). Liga com o segredo CHECKOUT_MONTHLY_SLOTS=10. Sem prazo falso; validade só em campanha real.
- Financeiro (decisão de 19/11, 17h14): mensalidades do personal presencial NÃO passam pela InfinitePay; cada aluno paga direto na conta do seu personal (Leandro ou Leonardo). O sistema só contabiliza. A InfinitePay fica para a consultoria online. Próximo passo: o Leandro vai enviar os relatórios de vendas da InfinitePay de 2026 (ano todo) para criarmos a importação no Financeiro (bruto, taxa, líquido, no cartão DivaFit).
- Falta para abrir: Turnstile (TURNSTILE_SITE_KEY/SECRET), aprovação final dos termos, publicar função + página, compra real de teste com estorno.

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


## 19/11 (noite) — ajustes após o 1º teste
- Resumo mostra: valor do plano → cupom (código, % e valor abatido) → total a pagar (cartão e Pix; uma linha só quando são iguais).
- Selos -20% (Mensal) e -35% em destaque (Trimestral); Trimestral mostra o Pix como "39% de desconto".
- Erros do banco aparecem com o motivo real (cupom esgotado, cupom indisponível para o plano etc.).
- Se a InfinitePay falhar ao gerar o link, o pedido vira `canceled` na hora e não prende cupom nem vaga.
- Depois de um erro, a página gera um novo pedido (novo request_id) e reinicia a verificação anti-robô.
- Cupom TESTE-DIVAFIT: 50%, só Mensal, 1 uso, até 19/11 23h59. Desativar após o teste.

## 19/11 (21h50) — compra de teste mantida e vagas em lotes de 5
- A compra de teste de R$ 78,80 (Leandro) NÃO foi estornada: o dinheiro fica no caixa e continua no Financeiro, com nota.
- O pedido de teste foi arquivado (`archived=true`) e não ocupa vaga; o cadastro de teste da "aluna" foi arquivado. Cupom TESTE-DIVAFIT desativado.
- Vagas: lotes de 5 (segredo opcional CHECKOUT_LOTE_SLOTS; padrão 5; 0 desliga). Cada pagamento confirmado não arquivado ocupa 1; ao fechar o lote, abre outro de 5. Texto na página: "Lote atual: restam X vagas de 5". CHECKOUT_MONTHLY_SLOTS deixou de ser usado.
- Página de retorno refeita: confere o pagamento sozinha (a cada 4 s por ~1 min), mostra as etapas Pagamento → Avaliação → Treino e só libera o botão do formulário depois da confirmação.
- Garantia (decisão do Leandro, 19/11 21h49): 30 dias no total a partir da compra. Dias 1–7: arrependimento por qualquer motivo (CDC art. 49). Dias 8–30: devolução se a aluna seguiu o programa (mesmas condições) e não percebeu evolução. Pedido até o 30º dia. Acabou o prazo de 37 dias.
- Pendente: trocar o segredo CHECKOUT_TERMS_VERSION para `oferta-2026-11-19-v2` (o Leandro digita no painel do Supabase) para os pedidos novos registrarem a garantia nova.
