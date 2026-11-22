# Funil de avaliação · Le&LeoFit

## Prévia para revisão

Abra /avaliacao/. A barra fica no topo e indica as 10 etapas, incluindo e-mail e WhatsApp. Cada tela pede uma informação, com altura em metros (aceita vírgula ou ponto), seguida da opção de fotos, do resultado parcial e das telas de e-mail e WhatsApp. Use dados fictícios. As respostas ficam somente na memória da página. A prévia não envia fotos, não cadastra leads e não gera estimativa de gordura. A oferta apresenta a Consultoria Online e tem alternativa para /desafio-21-dias/, com vendas fechadas. O WhatsApp é campo de contato, sem disparo.

## Origem das fórmulas

Fonte privada: AVALIAÇÕES FÍSICAS / Avaliacao Física Lean&Leofit.xlsx.
- Histórico I2: peso em kg dividido pela altura em metros ao quadrado.
- Histórico J2 e Config E1:H11: limites 18,5, 25, 30, 35 e 40 no velocímetro adulto. Classificação textual 60+: até 22, abaixo de 27, abaixo de 30 e 30 ou mais.
- Histórico AL2: abaixo de IMC 18,5 o cruzamento não é considerado. Até IMC 24,9, limite superior da cintura de 88 cm (F) ou 102 cm (M) separa risco baixo e moderado. Acima de IMC 24,9, limiares inferiores de 80 cm (F) e 94 cm (M) e superiores de 88 cm (F) e 102 cm (M) separam baixo, moderado e elevado. Optamos pela fórmula calculada nessa aba. A seção Config diverge e mistura razões de cintura/quadril com medidas em centímetros.
- Cintura/altura: dividir as duas medidas na mesma unidade. Exibimos a razão sem converter em diagnóstico. Referência: https://www.nice.org.uk/guidance/ng246/chapter/Recommendations

## Integrações pendentes antes de abrir o funil

1. Criar endpoint próprio para visitantes, separado de body-analysis (que exige login e grava rascunho). Validar e-mail antes de aceitar as fotos, normalizar os contatos e aplicar a cota por identidade verificada e o limite de 30 avaliações por dia no servidor. Validar Turnstile no backend antes de aceitar os arquivos. Manter chaves no Supabase e fotos no bucket privado. Definir retenção e incorporar o aviso com consentimento explícito antes de qualquer transmissão.
2. Gerar o resultado para a visitante só após autenticar a posse do contato. Salvar contato no CRM já existente. Aguardar escolha de serviço de e-mail com opção gratuita e validar domínio e envio antes de ativar. WhatsApp fica apenas como contato.
3. Vincular lead e checkout por identificador opaco. Liberar formulário de início somente após a confirmação autenticada de pagamento. Preencher respostas já disponíveis do funil e pedir CPF, anamnese e o PAR-Q resumido:
   - Você tem problema no coração ou pressão alta?
   - Sente dor no peito, tontura ou já desmaiou?
   - Tem doença crônica, usa remédio contínuo, está grávida ou no pós-parto?
   - Tem lesão óssea ou articular que piora com exercício?
   - Qualquer sim deve recomendar liberação médica antes de iniciar.
4. Testar dados fictícios de ponta a ponta, incluindo bloqueio de robô e duplicidade, privacidade, falhas do provedor, pagamento pendente e confirmação de pagamento. Nenhuma atividade de CRM ou checkout foi ativada nesta revisão.

## Desafio 21 dias

Já existem no Drive um material chamado Desafio de 21 Dias Copia & Cola e cronogramas do Emagreciência. O Financeiro tem uma categoria Desafio DIVAFIT. A relação entre esses materiais e a oferta nova precisa ser confirmada antes de vincular conteúdo. A página de revisão está pronta com vendas fechadas. Faltam preço aprovado, produto no checkout, regra de confirmação de pagamento e definir/testar a entrega das rotinas de treino.

## Testes

Rode npm test e node scripts/build.mjs. A suíte cobre faixas adultas e de 60+, limites de cintura por sexo, medida ausente e entradas inválidas. O ensaio autenticado com fotos na ferramenta interna depende do login da equipe. Nenhum registro real foi usado como dado de teste neste código.

Na prévia visual, a opção de fotos não tem caixa separada. Com três imagens selecionadas, o botão **Enviar fotos e ver avaliação** fica abaixo do aviso e registra a ação só na memória da página. **Continuar sem fotos** elimina a seleção. Para o lançamento, a mesma ação precisa gerar um comprovante de consentimento no servidor antes da transmissão, com data, versão do texto e finalidade. A faixa de gordura segue indisponível enquanto a análise pública não estiver integrada.

### Revisão mobile de 21/11/2026

Os contatos ficam na mesma tela. O aviso na etapa de fotos identifica a Lei nº 13.709/2018. Na prévia, o contato e as fotos ficam em memória e a avaliação sem análise de imagem bloqueia as métricas dependentes. Use `/avaliacao/?exemplo=1` para revisar a visualização preenchida com dados fictícios.

Na planilha Avaliacao Física Lean&Leofit, aba Histórico, AS2 contém as faixas de gordura, AT2/AU2 a massa magra, AW2 a TMR, AX2/AY2 o IMLG e sua classificação, BD2/BH2 o excedente e BI2 a projeção linear a 500 kcal/dia. As categorias adicionais da planilha foram preservadas. O alvo segue a instrução de usar o teto da faixa imediatamente melhor em AS2. Isso difere de BC2, que usa metas próprias e pode pular faixas. Excelente e muito baixa mantêm o valor atual. A projeção é teórica.

A função body-analysis existente exige sessão de equipe e consentimento cadastrado. A integração pública precisa de uma operação separada, com proteção anti-robô, limite diário, deduplicação, registro de finalidade e processamento privado. Nenhum upload ou e-mail real é disparado pela prévia.

### Integração pública de fotos

O endpoint `public-body-analysis` usa o mesmo modelo e a mesma validação de resposta da função da equipe. O navegador reduz as fotos e remove metadados ao reencodificar. As fotos são processadas em memória no DivaFit e enviadas à Anthropic. O Supabase conserva somente o registro de finalidade, horário e identificadores de contato protegidos com HMAC. A função pública não tem acesso a cadastros ou fotos de alunas. Se o modelo recusar as fotos ou a operação falhar, o contato pode tentar novamente. Cada reserva conta para o limite diário, inclusive falhas. O teto de 30 reinicia à meia-noite em São Paulo. O e-mail e o celular são informados pela pessoa, sem confirmação de titularidade.

Para homologar em um projeto Supabase de teste, aplique somente a migração `20261121162000_divafit_public_body_analysis.sql` e implante `public-body-analysis` com `--no-verify-jwt`. A função usa Turnstile e verificação de origem. Configure no Supabase `ANTHROPIC_API_KEY`, `PUBLIC_BODY_TURNSTILE_SECRET`, `PUBLIC_BODY_CONTACT_SECRET` (valor aleatório de pelo menos 32 caracteres, estável para preservar a deduplicação) e `PUBLIC_BODY_ORIGINS` (origens exatas separadas por vírgula). Configure somente no contexto de Deploy Preview da Netlify `PUBLIC_BODY_ENDPOINT` (URL HTTPS do endpoint no projeto de teste) e `PUBLIC_BODY_TURNSTILE_SITE_KEY` (chave pública). Autorize o hostname de preview no widget Turnstile. Sem as duas variáveis do front, a prévia mantém o fluxo demonstrativo. Antes de habilitar para dados reais, valide a retenção de dados e o texto de privacidade com os responsáveis do produto.

O plano gratuito do Resend pode ser usado para entrega posterior. Em Domains, adicione `envios.leeleo.com.br`; no DNS de `leeleo.com.br`, copie exatamente os registros SPF e DKIM indicados e clique Verify no Resend. Crie chave com permissão exclusiva de envio quando o domínio estiver verificado. Guarde a chave apenas no serviço de envio no servidor e use, por exemplo, `avaliacao@envios.leeleo.com.br`. Nenhum envio é ativado por esta mudança.

### Homologação no Supabase existente

A primeira implantação de `public-body-analysis` usa o projeto `ycchdswqaekdupmrnszz`. O modo de teste fica restrito à origem do PR 7 e aos passes de uso único com vencimento. O servidor guarda somente o SHA-256 do passe. Registros de tentativas de homologação têm `is_test=true`, quota separada e devem ser removidos após cada rodada. O retorno autenticado pelo passe inclui os tokens de entrada e saída. As fotos fictícias são processadas em memória, sem gravar no Storage.

Em Cloudflare → Turnstile → Add widget, escolha Managed e cadastre o hostname `deploy-preview-7--consultoria-divafit.netlify.app`. Use a sitekey pública em `PUBLIC_BODY_TURNSTILE_SITE_KEY`, no contexto Deploy Preview da Netlify. A chave secreta entra em Supabase → Edge Functions → Secrets como `PUBLIC_BODY_TURNSTILE_SECRET`. Para sair do modo de teste, configure também `PUBLIC_BODY_CONTACT_SECRET` (aleatório, longo e estável) e `PUBLIC_BODY_ORIGINS=https://deploy-preview-7--consultoria-divafit.netlify.app` no Supabase. A configuração do site de produção fica fora dessa etapa.

O envio pelo Resend fica desligado enquanto `PUBLIC_BODY_EMAIL_ENABLED` for diferente de `true`. Após verificar o remetente, adicionar `RESEND_API_KEY` e `PUBLIC_BODY_EMAIL_FROM` aos secrets da Edge Function, testar com um endereço autorizado e, só então, habilitar o envio. No modo de teste, o disparo permanece bloqueado. O HTML inclui o velocímetro em anexo inline e usa uma chave de idempotência por análise.

Na homologação, a função real recebeu três ilustrações fictícias e o Claude sinalizou que as fotos eram inadequadas para estimar gordura (HTTP 422). A Anthropic reportou 2.400 tokens de entrada e 3.230 de saída, com custo calculado de US$ 0,0371. O registro marcado como teste foi removido. O teste transacional no PostgreSQL confirmou a deduplicação por e-mail e celular, a recusa da 31ª reserva e a ausência de permissão para `anon`. O rollback deixou zero tentativas e zero passes de teste.

### Prévia compacta e teste de e-mail

O formulário tem largura máxima de 480 px. A prévia usa o remetente padrão `avaliacao@envios.leeleo.com.br` quando `PUBLIC_BODY_EMAIL_FROM` não é definido. O envio exige `PUBLIC_BODY_EMAIL_ENABLED=true` e `PUBLIC_BODY_EMAIL_TEST_RECIPIENTS` com os e-mails exatos autorizados, separados por vírgula. A função verifica o endereço e a origem da prévia no servidor e envia somente após uma estimativa aceita. Fora da prévia, o envio é bloqueado.

### Objetivo e metas da planilha

A pergunta de objetivo vem após a frequência de treino. Tela e e-mail utilizam o mesmo cálculo com AO como estimativa central. Histórico AS/AT/AU/AV/AW/AX/AY e BC–BI seguem a planilha, inclusive BC em vez da regra anterior de categoria consecutiva. A escolha das mensagens segue Dashboard B58 e os textos de P58:P62 são interpolados sem reescrita. Na Definição Muscular, BH = H + BG e BD, BE e BI exibem “-”. Na Hipertrofia, BC e BD exibem “-”, portanto a mensagem normal é P62. Uma projeção não equivale a uma garantia de prazo.

Verificação com fórmulas copiadas de Histórico para três linhas fictícias, recalculadas no LibreOffice. Emagrecimento: F, 35 anos, 1,65 m, 72 kg, 32% → alvo 29,9%, peso 69,84 kg, ganho 3,42 kg, excedente 2,16 kg e 33,22 dias. Definição: F, 48 anos, 1,60 m, 68 kg, 32% → alvo 29,9%, peso 72,76 kg, ganho 4,76 kg, excedente e prazo indisponíveis. Hipertrofia: M, 32 anos, 1,78 m, 80 kg, 18% → peso 81 kg, ganho 1 kg, 12.000 kcal e 30 dias.

### Metas independentes no funil

A regra online substitui as colunas BD/BI antigas por duas projeções independentes. Gordura a eliminar: AV − AU × BC / (1 − BC), com BC da planilha para todos os objetivos e prazo em kg × 7700 / 500. Ganho de músculo: BF/BG por objetivo como ponto de partida. Para IMLG abaixo de Excelente, a meta fica dentro do intervalo Excelente. Quem já alcançou esse intervalo ou está acima dele não recebe meta adicional de ganho. O prazo é kg × 30, e a tela e o e-mail mostram o ganho também em gramas. Metas abaixo de 0,5 kg ficam sem prazo. Gordura e IMLG excelentes geram mensagem de manutenção. A mensagem depende dos resultados calculados e os prazos não são somados.

### Resultado inicial e encaminhamento

A etapa 9 mostra a leitura inicial do IMC e explica suas limitações. Cada faixa tem duas mensagens e a variante permanece estável dentro do preenchimento. Fotos ficam na etapa 10 e os contatos na 11. A etapa 12 mostra o resumo informado. Sem fotos, oferece o Desafio. Com fotos, o convite à Consultoria fica no e-mail e a confirmação na tela exige retorno positivo do envio.

Sem fotos, a função usa a mesma verificação Turnstile e a mesma reserva por contato para enviar os indicadores iniciais via Resend. Esse ramo não chama a Anthropic. O e-mail informa “Envie suas fotos para desbloquear” e oferece o Desafio. Os logs registram o modo e o ID retornado pelo Resend, sem nome, telefone ou e-mail.

A oferta do Desafio substitui o resumo por e-mail no fluxo sem fotos. A peça está em `/avaliacao/email-desafio.html` somente na prévia. O disparo dessa oferta exige aprovação e `PUBLIC_BODY_CHALLENGE_EMAIL_APPROVED=true`, além dos controles já existentes. O ramo com fotos continua enviando a avaliação completa.

### Aprovação editorial no Trello

A lista Automações · mensagens automáticas do quadro CONSULTORIA ONLINE DIVAFIT é a fonte dos textos. E-mail 1: https://trello.com/c/mbQjyTjr. E-mail 2: https://trello.com/c/SWwCIqOY. As prévias com dados fictícios ficam em `/avaliacao/email-avaliacao.html` e `/avaliacao/email-desafio.html`. A revisão atual bloqueia ambos os disparos no servidor até a aprovação individual no Trello. Pendências editoriais do E-mail 2 aparecem na prévia.
