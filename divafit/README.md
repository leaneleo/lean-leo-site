# Consultoria Online DivaFit

Identidade do sistema: DIVAFIT, com logo completa e silhueta feminina no ícone. Antes de alterar o visual, ler
`BRAND.md`; usar `brand.css`, Comfortaa e os arquivos DivaFit aprovados em `assets/brand`.

## Aplicativo no celular

Versão instalável pelo navegador, no mesmo endereço do sistema e sem lojas.
Android: abrir no Chrome e usar Instalar DivaFit ou o menu Adicionar à tela
inicial. iPhone: abrir no Safari, Compartilhar, Adicionar à Tela de Início.
O botão de instalação fica no final da página, visível quando aberta no navegador,
mesmo após uma instalação ou quando o convite nativo não está disponível.
Na janela instalada, o rodapé é ocultado. A ajuda apresenta o ícone atual e os
passos para revisar a atualização ou reinstalar uma instalação antiga.
O navegador/Android controla o ícone e a abertura já instalados; o site não pode
substituí-los no aparelho sem a atualização aceita ou uma nova instalação.
Os arquivos de ícones têm URLs versionadas; caminhos antigos servem também a
silhueta atual. A identidade do app e o endereço de início permanecem estáveis.
Ao abrir pelo ícone, o sistema usa uma janela própria. Acesso restrito à equipe
existente; esta versão não cria acesso para alunos nem altera permissões.

O manifest define identidade, escopo, cores e ícones PNG exportados do silhueta feminina da logo DIVAFIT e copiados pelo build.
`mobile.js` oferece a instalação nativa quando o navegador permite e instruções
quando não permite. A confirmação final da instalação é sempre do usuário.
As atualizações continuam pela publicação do site.

O service worker guarda somente `offline.html`, `offline.css` e a logo pública DIVAFIT. Navegações
consultam sempre a rede; requisições da API e respostas autenticadas nunca
entram no cache do worker. Sem internet, há aviso ou página de reconexão, sem
gravação offline. Nenhuma senha ou token é adicionado ao cache. O login atual
é mantido sem alterar a política de sessão existente; uma janela nova pode
pedir login novamente. Não há push ou sincronização Mfit automática.

Validar com `node --test tests/*.test.mjs` e `node scripts/build.mjs`.
Testar o manifesto e seus ícones publicados, navegação em celular, instruções
de instalação e fallback de desconexão. A instalação no aparelho real depende
da confirmação no Chrome ou Safari do usuário.

Aplicativo estático de gestão em Netlify, separado do site institucional; autenticação e dados privados no Supabase. Somente chaves públicas podem ser incluídas no cliente.

## Rotina da equipe

Visão Geral é a entrada principal. Alunos aparecem em ordem alfabética; Inativos lista quem não possui início de rotina nos três últimos meses de calendário. A data da importação não determina atividade.

Cada aluno tem cabeçalho editável com nascimento (idade calculada em São Paulo), objetivo, peso, altura, academia, disponibilidade, outras atividades, limitações, preferências e regiões de interesse. Modalidade aparece somente no cadastro e no cabeçalho. Dados ausentes ficam não informados, sem estimar nascimento a partir de idade antiga.

Registrar Nova Rotina cria o histórico do próprio aluno. O resumo contém datas, frequência prevista, VSSAM original e esperado, nível por volume esperado, métodos e originalidade. A validade editada atualiza os próximos passos. Observações da equipe e relatos dos alunos são anexados na mesma tela, com data e auditoria.

Nova aumenta a contagem na biblioteca; Igual mantém o histórico sem aumentar essa contagem. Todas as 125 rotinas anteriores foram inicializadas como Nova por solicitação do usuário em 28/10/2026. A referência bruta e os valores anteriores permanecem preservados no banco.

Produção, Fila e Fichas e Entregas saíram da navegação. Biblioteca conserva sugestões por formato, programação semanal e uso anterior. Cálculos, Instruções e Financeiro ficam por último. Proteína usa fator informado pelo profissional; original soma cada sessão uma vez e esperado incorpora repetições na semana. Métodos e volume têm classificações independentes.

## Fontes e integração

**Prioridade autorizada: MFIT > Word/Excel do Drive para dados atuais de alunos e rotinas.** Preservar divergências e proveniência; nunca sobrescrever a MFIT usando controles antigos. O servidor fornecido pelo suporte é https://mcp.mfitpersonal.com.br/mcp, com OAuth. Instalar o plugin no ChatGPT não ativa por si só uma integração persistente do site; a conexão ao plugin foi verificada por uma consulta pontual em 28/10/2026. O plugin restringe exportação e migração em lote; não usar consultas repetidas para contornar essa restrição. Não colocar tokens ou senhas no código, banco público, GitHub ou navegador cliente.

## Segurança e validação

### Entrada pelo Google Forms

Formulário autorizado: `1sh8auc4F7zdrqVv-pl3ERwey6nKfE7dzWPx1U_7fgg4`, conta `leaneleofit@gmail.com`.
Em Configurações, o administrador usa **Conectar Google Forms** para gerar uma chave exclusiva de recebimento e copiar o script privado. No Google Apps Script, salvar em um projeto dedicado, executar `instalarDivaFit` e revisar/autorizar as permissões do Google. Não publicar como web app. A instalação gera um gatilho de envio e um gatilho de repetição de pendências a cada 15 minutos. O usuário pode executar `importarAnterioresDivaFit` para lotes de até 15 respostas antigas. Não coloca chave administrativa do Supabase no Google ou no navegador; somente uma chave exclusiva, revogável, desse formulário.

O endpoint `forms-intake` autentica essa chave por SHA-256, valida o formulário e limita o tamanho. O banco serializa gravações, evita repetição do mesmo evento e procura o aluno por e-mail, telefone ou nome normalizado. Quando existe um único cadastro compatível, só preenche lacunas e acrescenta a avaliação; preserva as anotações e os dados atuais. Quando há mais de um, guarda a resposta privada para o administrador vincular em **Revisar possíveis duplicidades**. Não cria rotina, cobrança nem autorização de WhatsApp.

As respostas completas e a data ficam preservadas; o panorama organiza os relatos em Dados Gerais, Avaliação Física e Anamnese. Nascimento só é preenchido quando existe data explícita; idade avulsa e medidas ambíguas não são adivinhadas. Não infere classificação clínica nem risco cardiovascular. Há resumo legível e acesso separado ao texto original do contrato. O marcador “Última resposta recebida” confirma recebimento pelo DivaFit; gerar o código sozinho não confirma a instalação no Google. Depois de autorizar, validar com uma resposta real ou um lote histórico e conferir o cadastro. Não enviar respostas fictícias ao formulário de produção.

O navegador de validação não estava disponível nesta alteração. Testes locais cobrem os filtros, os níveis, o mapeamento e a renderização. Testes transacionais remotos conferem recebimento, repetição, preservação e permissões, com rollback. O fluxo real Google → DivaFit depende da autorização do gatilho na conta Google.

Aplicar as migrações em ordem. Todas as tabelas operacionais têm RLS, permissões de equipe, controle de versão e auditoria; pagamentos são restritos ao administrador. A gravação do resumo de rotina e o espelhamento do modelo exclusivo são transacionais. A cópia mantém origem e marca Igual quando a equipe não escolhe contá-la como Nova.

Executar npm test, node --check app.js e node scripts/build.mjs. Testes transacionais de produção devem sempre ser revertidos. A revisão de perfis consultou 53 cadastros e encontrou 28 nascimentos explícitos; os demais precisam ser preenchidos pela equipe ou pela integração autorizada.
