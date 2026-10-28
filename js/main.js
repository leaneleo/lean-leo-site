document.addEventListener("DOMContentLoaded", function () {
  function revelarElementos() {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach(function (elemento) {
      const windowHeight = window.innerHeight;
      const elementTop = elemento.getBoundingClientRect().top;
      const elementVisible = 100;

      if (elementTop < windowHeight - elementVisible) {
        elemento.classList.add("ativo");
      } else {
        elemento.classList.remove("ativo");
      }
    });
  }

  window.addEventListener("scroll", revelarElementos);
  revelarElementos();
});

// Funciona tanto nas páginas antigas quanto no cabeçalho atualizado.
function toggleMenu() {
  const menu = document.querySelector('.menu');
  const button = document.querySelector('.hamburger');
  if (!menu || !button) return;
  const expanded = menu.classList.toggle('active');
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('aria-label', expanded ? 'Fechar menu' : 'Abrir menu');
}
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu');
  const button = document.querySelector('.hamburger');
  if (!menu || !button) return;
  if (!button.hasAttribute('onclick')) button.addEventListener('click', toggleMenu);
  function closeMenu() {
    menu.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Abrir menu');
  }
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('active')) {
      closeMenu(); button.focus();
    }
  });
});
