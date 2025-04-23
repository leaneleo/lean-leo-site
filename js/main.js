document.addEventListener("DOMContentLoaded", function () {
  function revelarElementos() {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach(function (elemento) {
      const windowHeight = window.innerHeight;
      const elementTop = elemento.getBoundingClientRect().top;
      const elementVisible = 100;

      if (elementTop < windowHeight - elementVisible) {
        elemento.classList.add("ativo");
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

const track = document.getElementById('carrosselTrack');

let isDown = false;
let startX;
let scrollLeft;

track.addEventListener('mousedown', (e) => {
  isDown = true;
  track.classList.add('pause');
  startX = e.pageX - track.offsetLeft;
  scrollLeft = track.scrollLeft;
});

track.addEventListener('mouseleave', () => {
  isDown = false;
  track.classList.remove('pause');
});

track.addEventListener('mouseup', () => {
  isDown = false;
  track.classList.remove('pause');
});

track.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - track.offsetLeft;
  const walk = (x - startX) * 1.5;
  track.scrollLeft = scrollLeft - walk;
});

track.addEventListener('touchstart', () => {
  track.classList.add('pause');
});

track.addEventListener('touchend', () => {
  track.classList.remove('pause');
});
