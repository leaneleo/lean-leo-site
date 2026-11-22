# Avaliação corporal por fotos no DivaFit

Na ficha do aluno, abra **Avaliação corporal por fotos**. A equipe registra o consentimento documentado, seleciona frente, lado e costas e informa as medidas do adulto. A função gera um rascunho. Se as fotos não servirem, o rascunho mostra o motivo e permite descarte. A equipe pode aprovar os valores originais, editar a faixa e aprovar ou descartar. O histórico exibe a evolução dos aprovados. **Imprimir / salvar PDF** aparece somente em análises aprovadas e abre a impressão do navegador.

A estimativa visual é exploratória. A confiança é a autoavaliação do modelo. A faixa não é um intervalo estatístico validado. A massa gorda usa peso × percentual, e a massa magra estimada é o restante.

## Código

- `body-analysis-ui.js`, `student-ui.js`, `api.js`, `brand.css`, `scripts/build.mjs` e `netlify.toml` integram a tela e permitem imagens com URL assinada do Supabase.
- `supabase/migrations/20261121150000_divafit_body_analysis.sql` acrescenta consentimento, análises, reserva diária, auditoria, bucket privado e permissões. Reusa `students` e `team_members`.
- `supabase/functions/body-analysis` valida o login pela API Auth, confere a equipe, valida as fotos JPEG, reduz o lado maior para até 1200 px e chama a API Messages. Não envia nome ou ID ao provedor. O servidor devolve links com validade de 60 s.
- A reserva é atômica, no fuso de São Paulo, com limite de 30 solicitações por dia para a equipe inteira. Solicitações reservadas contam mesmo se a chamada falhar. JSON inválido tem uma segunda tentativa. Os tokens das respostas válidas quanto a métricas são somados no rascunho criado.
- RLS restringe leitura à equipe. A revisão passa por função SQL e só muda um rascunho uma vez. A auditoria inclui autor, horário e evento, sem replicar medidas ou fotos. Revogar o consentimento bloqueia novas análises e novas URLs assinadas. Solicitações de apagamento dos arquivos e registros já existentes precisam de tratamento administrativo.

## Chave e primeiro teste

1. Em [Anthropic Console → API Keys](https://console.anthropic.com/settings/keys), Leandro cria a chave.
2. No ambiente Supabase autorizado para teste, abra **Edge Functions → Secrets**, adicione o nome `ANTHROPIC_API_KEY` e cole a chave diretamente no painel. A chave jamais deve entrar no Git, no código ou em configuração Netlify.
3. Em ambiente isolado aprovado, aplique a migração e publique a função `body-analysis`. O deploy preview da Netlify cobre somente o front. Antes de usar sua interface autenticada com a função, confirme qual Supabase está configurado no preview.
4. Use um cadastro fictício. Confirme bloqueios sem consentimento e fora da equipe, registre autorização e use três fotos fornecidas pelo Leandro ou Leonardo. Confira rascunho, revisão, histórico, PDF e auditoria. Abra Network e confirme que a aplicação chama Supabase, sem chave da Anthropic e sem chamada direta à Anthropic.
5. Após teste e confirmação, Leandro aprova o merge e autoriza aplicar migração e publicar função no [projeto DivaFit](https://supabase.com/dashboard/project/ycchdswqaekdupmrnszz). A branch-base publica automaticamente.
6. Confirme a finalidade, retenção e acesso aos dados pessoais antes de usar fotos de alunas reais.

## Testes e custo

`node --test tests/body-analysis.test.mjs` usa dependências simuladas para bloqueio de acesso, consentimento, limite diário, JSON inválido e retry bem-sucedido. `supabase/tests/body_analysis.sql` é o ensaio de RLS, auditoria, rascunho e aprovação em uma transação revertida, em ambiente isolado.

A tarifa padrão consultada do Claude Sonnet 5.5 é US$ 2 por milhão de tokens de entrada e US$ 10 por milhão de saída. Cálculo por rascunho: (entrada × 2 + saída × 10) ÷ 1.000.000. Exemplo simulado de 2.000 de entrada e 400 de saída: US$ 0,008. Falhas sem rascunho podem gerar custo na Anthropic e precisam ser conferidas no console. O teste real com fotos e a chave do Leandro vai fornecer os tokens e o custo medido.

[Documentação da Anthropic](https://platform.claude.com/docs/en/models/sonnet-5-5/overview)
