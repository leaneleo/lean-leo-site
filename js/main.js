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
  revelarElementos(); // ativa na primeira carga
});
