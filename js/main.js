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

// Menu Hamburguer
const hamburger = document.getElementById('hamburger');
const menu = document.getElementById('menu');

hamburger.addEventListener('click', () => {
  menu.classList.toggle('active');
});
