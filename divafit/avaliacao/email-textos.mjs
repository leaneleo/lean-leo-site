export const trelloCopy={
  "avaliacao": {
    "subject": "{nome}, sua avaliação física chegou",
    "messages": [
      "{nome}, seu caminho é a recomposição corporal: eliminar {X} kg de gordura em cerca de {D} dias e ganhar {G} g de músculo em cerca de {D2} dias. São duas metas calculadas separadamente, e a gente organiza as etapas com você.",
      "{nome}, seu foco é reduzir gordura sem perder massa magra. Com déficit de 500 kcal por dia, a projeção é eliminar {X} kg em cerca de {D} dias.",
      "{nome}, sua gordura já está num bom nível. Agora o foco é ganhar massa magra: com superávit de 400 kcal por dia, a projeção é ganhar {G} g de músculo em cerca de {D2} dias.",
      "Parabéns, {nome}! Seu percentual de gordura e seu volume muscular estão na faixa Excelente. Agora o objetivo é manter esse resultado com constância no treino, na alimentação e no descanso.",
      "{nome}, pelos cálculos você não tem meta de perda de gordura nem de ganho muscular agora. Continue acompanhando suas medidas e seu desempenho nos treinos."
    ],
    "offer": "Quer um plano feito para você chegar lá? Conheça a Consultoria Online Le&LeoFit.",
    "button": "Quero minha consultoria",
    "footer": [
      "Projeções teóricas. Prazos e resultados variam de pessoa para pessoa. A alimentação deve ser ajustada por um profissional.",
      "Esta avaliação foi feita por inteligência artificial e fórmulas, pode conter erros e não substitui uma avaliação presencial.",
      "🔒 Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD): Lei n. 13.709, de 14 de agosto de 2018. Nada será publicado sem sua autorização.",
      "Leandro e Leonardo · Le&LeoFit · leeleo.com.br"
    ]
  },
  "desafio": {
    "subject": "{nome}, o Desafio Black começa dia 30",
    "blocks": [
      "Oi, {nome}!",
      "Seu resultado parcial já está na tela: IMC, risco pela cintura e relação cintura/altura. É um ótimo ponto de partida.",
      "Agora queremos te fazer um convite.",
      "**DESAFIO BLACK · Emagrecimento e Definição**\n21 dias · de 30/11 a 20/12",
      "[CONFIRMAR o que está incluso: treino? dieta em grupo? grupo no WhatsApp? app?]",
      "São só 21 dias para você sair do \"vou começar segunda\" e chegar ao fim do ano se sentindo mais leve e mais forte.",
      "[Botão] Quero entrar no Desafio",
      "As vagas são limitadas. [CONFIRMAR se é verdade antes de usar]",
      "Até lá,\nLeandro e Leonardo · Le&LeoFit"
    ],
    "footer": [
      "🔒 Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD): Lei n. 13.709, de 14 de agosto de 2018. Nada será publicado sem sua autorização.",
      "leeleo.com.br"
    ]
  }
};

// Aprovação no Trello exigida individualmente para cada revisão do texto.
export const trelloAprovado={avaliacao:true,desafio:false};
export const escapar=texto=>String(texto).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const substituir=(texto,valores)=>texto.replace(/\{(\w+)\}/g,(_,chave)=>String(valores[chave]??''));
