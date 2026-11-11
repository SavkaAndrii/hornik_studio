'use strict';

// Small, independent enhancements; all primary content lives in semantic HTML.
const menuButton = document.querySelector('.header__toggle');
const navigation = document.querySelector('#main-navigation');
const mobileQuery = window.matchMedia('(max-width: 760px)');

function closeMenu({ restoreFocus = false } = {}) {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('menu--open');
  if (restoreFocus) menuButton.focus();
}

function syncMenu() {
  menuButton.hidden = !mobileQuery.matches;
  navigation.classList.toggle('menu--enhanced', mobileQuery.matches);
  closeMenu();
}

if (menuButton && navigation) {
  syncMenu();
  mobileQuery.addEventListener('change', syncMenu);
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('menu--open', open);
  });
  navigation.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !mobileQuery.matches) return;
    closeMenu();
    // Move keyboard focus out of the collapsed menu to the chosen section.
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu({ restoreFocus: true });
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header')) closeMenu();
  });
}

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealElements = document.querySelectorAll('[data-reveal]');
let revealObserver;
if ('IntersectionObserver' in window && !motionQuery.matches) {
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal--pending');
      entry.target.classList.add('reveal--visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealElements.forEach(element => {
    // Do not hide content already visible or at an initial deep-link destination.
    if (element.getBoundingClientRect().top >= window.innerHeight) {
      element.classList.add('reveal--pending');
      revealObserver.observe(element);
    }
  });
}
motionQuery.addEventListener('change', event => {
  if (!event.matches) return;
  revealObserver?.disconnect();
  revealElements.forEach(element => element.classList.remove('reveal--pending'));
});

// Active navigation follows the section crossing the upper reading area.
const navLinks = [...document.querySelectorAll('.menu__list-link')];
const sections = [...document.querySelectorAll('main > section[id]')];
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const targetId = entry.target.id === 'process' ? 'works' : entry.target.id;
      navLinks.forEach(link => {
        if (link.hash === `#${targetId}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -70% 0px' });
  sections.forEach(section => sectionObserver.observe(section));
}

// Intentionally no network, storage, or success state until a real endpoint exists.
document.querySelector('[data-project-form]')?.addEventListener('submit', event => event.preventDefault());
document.querySelector('[data-year]').textContent = String(new Date().getFullYear());

// Header background: observe the existing hero; no continuous scroll listener.
const header = document.querySelector('.header');
const hero = document.querySelector('.main-screen');
const heroImage = document.querySelector('.main-screen__img');
const pointerQuery = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
let heroInView = false;
let pointerListening = false;
let pointerFrame = 0;
let pointerX = 0;
let pointerY = 0;

function resetParallax() {
  cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  heroImage?.style.removeProperty('--parallax-x');
  heroImage?.style.removeProperty('--parallax-y');
}

function updateParallax(event) {
  if (!hero || !heroImage) return;
  const bounds = hero.getBoundingClientRect();
  // A maximum of 3 px preserves the artwork's original clipping and composition.
  pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * 6;
  pointerY = ((event.clientY - bounds.top) / bounds.height - .5) * 6;
  if (pointerFrame) return;
  pointerFrame = requestAnimationFrame(() => {
    heroImage.style.setProperty('--parallax-x', `${pointerX.toFixed(2)}px`);
    heroImage.style.setProperty('--parallax-y', `${pointerY.toFixed(2)}px`);
    pointerFrame = 0;
  });
}

function syncParallax() {
  const enabled = Boolean(hero && heroImage && heroInView && pointerQuery.matches && !motionQuery.matches && !document.hidden);
  if (enabled === pointerListening) return;
  pointerListening = enabled;
  if (enabled) {
    hero.addEventListener('pointermove', updateParallax, { passive: true });
    hero.addEventListener('pointerleave', resetParallax);
  } else {
    hero?.removeEventListener('pointermove', updateParallax);
    hero?.removeEventListener('pointerleave', resetParallax);
    resetParallax();
  }
}

if (hero && 'IntersectionObserver' in window) {
  const heroObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      heroInView = entry.isIntersecting;
      hero.classList.toggle('main-screen--in-view', heroInView && !document.hidden);
      header?.classList.toggle('header--scrolled', !entry.isIntersecting && entry.boundingClientRect.top < 0);
      syncParallax();
    });
  });
  heroObserver.observe(hero);
}
pointerQuery.addEventListener('change', syncParallax);
motionQuery.addEventListener('change', syncParallax);
document.addEventListener('visibilitychange', () => {
  hero?.classList.toggle('main-screen--in-view', heroInView && !document.hidden);
  syncParallax();
});
