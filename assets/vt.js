/* Smooth page transitions between the pages of this site (cross-document View Transitions).
   Every page opts in with `@view-transition { navigation: auto; }` in its CSS. This script adds one thing:
   the project card you clicked grows into the page it opens, and shrinks back into its card when you return.
   Browsers without support simply navigate as normal. */
(function () {
  if (!('onpagereveal' in window)) return;
  var KEY = 'vt-card';
  function get() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) {} }

  // Remember which card a link belongs to (or forget it for any other link).
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var card = a.closest('[data-vt]');
    set(card ? card.getAttribute('data-vt') : null);
  }, true);

  // The element that should morph on this page: the card's picture on the home page, or the whole page on a project page.
  function target(k) {
    if (!k) return null;
    var thumb = document.querySelector('[data-vt="' + k + '"] .card-thumb');
    if (thumb) return thumb;
    if (document.documentElement.getAttribute('data-vt-page') === k) return document.body;
    return null;
  }
  function name(el, on) { if (el) el.style.viewTransitionName = on ? 'card-open' : ''; }

  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    var el = target(get());
    name(el, true);
    e.viewTransition.finished.finally(function () { name(el, false); });
  });
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    var el = target(get());
    name(el, true);
    e.viewTransition.finished.finally(function () { name(el, false); });
  });
})();
