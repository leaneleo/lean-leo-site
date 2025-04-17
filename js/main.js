document.addEventListener("DOMContentLoaded", function () {
  function revelarElementos() {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach(el => {
      const windowHeight = window.innerHeight;
      const elementTop = el.getBoundingClientRect().top;
      const elementVisible = 150;
      if (elementTop < windowHeight - elementVisible) {
        el.classList.add("ativo");
      } else {
        el.classList.remove("ativo");
      }
    });
  }

  window.addEventListener("scroll", revelarElementos);
  revelarElementos();
});
