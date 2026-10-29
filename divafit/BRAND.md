# Identidade DIVAFIT · sistema e aplicativo

Diretriz permanente de Leandro, atualizada em 29/10/2026: usar a logo completa
DIVAFIT com a silhueta feminina no título do sistema, e somente a silhueta
no ícone do aplicativo. A fonte é `img/bannerdivafit.png` da pasta central.
Não usar a logo Lean&LeoFit no cabeçalho nem no ícone do DivaFit.
Lean&LeoFit fica reservada para situações pessoais/institucionais de Leandro
e Leonardo. A paleta laranja/dourado/branco e Comfortaa continuam sendo usadas.

Fonte de referência: pasta `Identidade Visual Lean&LeoFit`, com o manual
`Apresentação ID Visual Lean e Leo FIT -.pdf`, logotipos aprovados e Comfortaa.
Não substituir a marca por um símbolo inventado ou por outra família de cores.

## Paleta e aplicação digital

- Laranja avermelhado da amostra/RGB do manual: `#D54930` (213, 73, 48).
- Laranja escuro, código hexadecimal impresso no manual: `#C54930`.
  Usar em ações e textos para maior contraste sobre branco.
- Dourado da amostra/RGB: `#F0B057` (240, 176, 87).
- Branco: `#FFFFFF`.
- Derivar fundos claros dessas cores. Neutros quentes para textos e bordas.
- Reservar verde/vermelho semântico para sucesso/erro quando necessário.
  Não usar roxo como identidade do produto.

O manual possui divergência entre o hexadecimal e o RGB do laranja e um
hexadecimal incompleto no dourado. Foram preservadas as referências RGB das
amostras; o hexadecimal válido mais escuro foi aproveitado nas ações.

## Tipografia e logotipo

Comfortaa, com licença OFL, hospedada localmente em `assets/brand`.
Pesos 300–700. Evitar fontes externas e pesos que a família não oferece.
O arquivo original `assets/brand/bannerdivafit.png` identifica o sistema.
Ele deve aparecer inteiro na área da palavra DIVAFIT, preservando a silhueta
que faz parte da composição. O enquadramento CSS retira apenas as margens
vazias do banner e preserva o arquivo original. Texto alternativo: DIVAFIT.
Preservar proporções, cores e área de respiro. Não redesenhar, esticar ou
recolorir o logotipo. As exportações PNG do ícone usam a silhueta extraída,
com fundo laranja/dourado e área de respiro para os recortes do celular.

`brand.css` concentra os tokens e a aplicação. As variáveis antigas `--purple`
e `--mint` são aliases de compatibilidade para o laranja e seu fundo claro.
Novos componentes devem usar os tokens `--brand-*`.

Os ícones do aplicativo são `divafit-192.png`, `divafit-512.png`,
`divafit-maskable.png` e `divafit-apple.png`, em `assets/brand`.
A silhueta foi preparada com a ferramenta integrada de imagens, usando o
banner como referência; o resultado está em `divafit-silhouette.png`.
O pedido usado foi extrair somente a silhueta branca feminina que substitui
a letra A no banner, sem letras nem fundo, preservando pose e proporções;
na revisão, limpar ruídos e manter os recortes curvos transparentes.
A logo completa foi copiada sem edição. Os antigos avatares Lean&LeoFit
permanecem no acervo de arquivos, sem uso no cabeçalho ou nos ícones atuais.
A versão maskable tem margem adicional para recortes dos celulares.
Ao mudar a identidade, atualizar também manifesto, ícones, barra do navegador,
tela sem conexão e guia de instalação. Conferir computador e celular.

## Limites

Mudanças visuais não devem alterar os dados, permissões, cálculos ou fluxos.
O cabeçalho de aluno continua inteiro, sem rolagem interna e sem acompanhar
a página. Evitar introduzir novas bibliotecas apenas para aplicar a marca.
