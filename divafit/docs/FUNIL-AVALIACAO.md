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
