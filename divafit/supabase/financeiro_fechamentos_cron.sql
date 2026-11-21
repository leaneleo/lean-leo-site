-- Preparação de rascunhos no dia 1 às 6h de São Paulo (9h UTC).
-- Nenhum envio de WhatsApp, cobrança ou serviço adicional pago.
create extension if not exists pg_cron;
select cron.schedule('divafit-fechamentos-mensais','0 9 1 * *',$job$
select private.finance_prepare_closings((date_trunc('month',now() at time zone 'America/Sao_Paulo')-interval '1 month')::date);
$job$);
