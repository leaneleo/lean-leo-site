# Consultoria Online DivaFit

## Aplicativo no celular

Versão instalável pelo navegador, no mesmo endereço do sistema e sem lojas.
Android: abrir no Chrome e usar Instalar DivaFit ou o menu Adicionar à tela
inicial. iPhone: abrir no Safari, Compartilhar, Adicionar à Tela de Início.
Ao abrir pelo ícone, o sistema usa uma janela própria. Acesso restrito à equipe
existente; esta versão não cria acesso para alunos nem altera permissões.

O manifest define identidade, escopo, cores e ícones PNG gerados pelo build.
`mobile.js` oferece a instalação nativa quando o navegador permite e instruções
quando não permite. A confirmação final da instalação é sempre do usuário.
As atualizações continuam pela publicação do site.

O service worker guarda somente `offline.html` e `offline.css`. Navegações
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

Aplicar as migrações em ordem. Todas as tabelas operacionais têm RLS, permissões de equipe, controle de versão e auditoria; pagamentos são restritos ao administrador. A gravação do resumo de rotina e o espelhamento do modelo exclusivo são transacionais. A cópia mantém origem e marca Igual quando a equipe não escolhe contá-la como Nova.

Executar npm test, node --check app.js e node scripts/build.mjs. Testes transacionais de produção devem sempre ser revertidos. A revisão de perfis consultou 53 cadastros e encontrou 28 nascimentos explícitos; os demais precisam ser preenchidos pela equipe ou pela integração autorizada.
