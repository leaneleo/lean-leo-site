document.addEventListener("DOMContentLoaded", function () {
  function revelarElementos() {
    const reveals = document.querySelectorAll(".reveal");
    for (let i = 0; i < reveals.length; i++) {
      const windowHeight = window.innerHeight;
      const elementTop = reveals[i].getBoundingClientRect().top;
      const elementVisible = 100;
      if (elementTop < windowHeight - elementVisible) {
        reveals[i].classList.add("ativo");
      } else {
        reveals[i].classList.remove("ativo");
      }
    }
  }

  window.addEventListener("scroll", revelarElementos);
  revelarElementos();
});
