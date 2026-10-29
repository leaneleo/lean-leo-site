# Identidade Lean&LeoFit · DivaFit

Diretriz permanente de Leandro, 29/10/2026: utilizar a identidade visual
Lean&LeoFit no DivaFit e nas próximas alterações relacionadas à marca.

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
O avatar laranja aprovado identifica o sistema e o aplicativo; manter o nome
DivaFit no produto e Lean&LeoFit no texto alternativo da marca.
Preservar proporções, cores e área de respiro. Não redesenhar, esticar ou
recolorir o logotipo. As exportações PNG são apenas reduções do avatar original.

`brand.css` concentra os tokens e a aplicação. As variáveis antigas `--purple`
e `--mint` são aliases de compatibilidade para o laranja e seu fundo claro.
Novos componentes devem usar os tokens `--brand-*`.

Os ícones do aplicativo vêm dos arquivos aprovados em `assets/brand`.
A versão maskable tem margem adicional para recortes dos celulares.
Ao mudar a identidade, atualizar também manifesto, ícones, barra do navegador,
tela sem conexão e guia de instalação. Conferir computador e celular.

## Limites

Mudanças visuais não devem alterar os dados, permissões, cálculos ou fluxos.
O cabeçalho de aluno continua inteiro, sem rolagem interna e sem acompanhar
a página. Evitar introduzir novas bibliotecas apenas para aplicar a marca.
