// Animações ao rolar a página
const elements = document.querySelectorAll('section, .depoimento, .plano, .pessoa, .post');

const options = {
  threshold: 0.1
};

const observer = new IntersectionObserver(function(entries, observer) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('ativo');
    }
  });
}, options);

elements.forEach(el => {
  observer.observe(el);
});
