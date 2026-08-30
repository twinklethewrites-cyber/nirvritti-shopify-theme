/* Nirvritti theme — vanilla JS, no dependencies */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector("[data-site-header]");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Drawers (mobile nav / cart) ---------- */
  function openDrawer(drawer) {
    if (!drawer) return;
    var overlayId = drawer.getAttribute("data-overlay");
    var overlay = overlayId ? document.getElementById(overlayId) : drawer.parentElement.querySelector(".drawer-overlay");
    drawer.classList.add("is-open");
    if (overlay) overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var focusable = drawer.querySelector("button, a, input");
    if (focusable) focusable.focus({ preventScroll: true });
  }
  function closeDrawer(drawer) {
    if (!drawer) return;
    var overlayId = drawer.getAttribute("data-overlay");
    var overlay = overlayId ? document.getElementById(overlayId) : drawer.parentElement.querySelector(".drawer-overlay");
    drawer.classList.remove("is-open");
    if (overlay) overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  document.addEventListener("click", function (e) {
    var openTrigger = e.target.closest("[data-drawer-open]");
    if (openTrigger) {
      e.preventDefault();
      var target = document.getElementById(openTrigger.getAttribute("data-drawer-open"));
      openDrawer(target);
    }
    var closeTrigger = e.target.closest("[data-drawer-close]");
    if (closeTrigger) {
      e.preventDefault();
      var drawer = closeTrigger.closest(".drawer") || document.getElementById(closeTrigger.getAttribute("data-drawer-close"));
      closeDrawer(drawer);
    }
    if (e.target.classList.contains("drawer-overlay")) {
      document.querySelectorAll(".drawer.is-open").forEach(closeDrawer);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".drawer.is-open").forEach(closeDrawer);
      document.querySelectorAll(".search-popover.is-open").forEach(function (p) { p.classList.remove("is-open"); });
    }
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-stagger");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }
  var heroEls = document.querySelectorAll(".hero");
  heroEls.forEach(function (el) { el.classList.add("is-visible"); });

  /* ---------- Accordions ---------- */
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest(".accordion__trigger");
    if (!trigger) return;
    var item = trigger.closest(".accordion__item");
    var panel = item.querySelector(".accordion__panel");
    var isOpen = item.classList.contains("is-open");
    item.classList.toggle("is-open", !isOpen);
    panel.style.maxHeight = isOpen ? null : panel.scrollHeight + "px";
  });

  /* ---------- Announcement bar rotation ---------- */
  var slides = document.querySelectorAll("[data-announcement-slide]");
  if (slides.length > 1) {
    var idx = 0;
    setInterval(function () {
      slides[idx].classList.remove("is-active");
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add("is-active");
    }, 4500);
  }

  /* ---------- Predictive search ---------- */
  var searchInput = document.querySelector("[data-predictive-search-input]");
  if (searchInput) {
    var popover = document.querySelector("[data-search-popover]");
    var resultsEl = document.querySelector("[data-predictive-results]");
    var searchTimer;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      var q = searchInput.value.trim();
      if (q.length < 2) {
        popover.classList.remove("is-open");
        return;
      }
      searchTimer = setTimeout(function () {
        fetch("/search/suggest.json?q=" + encodeURIComponent(q) + "&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var products = (data.resources && data.resources.results && data.resources.results.products) || [];
            if (!products.length) {
              resultsEl.innerHTML = '<p class="search-empty">No products found for "' + q.replace(/</g, "") + '"</p>';
            } else {
              resultsEl.innerHTML = products
                .map(function (p) {
                  return (
                    '<a class="predictive-result" href="' + p.url + '">' +
                    (p.image ? '<img src="' + p.image + '" alt="" loading="lazy" width="52" height="52">' : "") +
                    '<span><span class="predictive-result__title">' + p.title + '</span><br><span class="predictive-result__price">' + p.price + "</span></span>" +
                    "</a>"
                  );
                })
                .join("");
            }
            popover.classList.add("is-open");
          })
          .catch(function () {});
      }, 220);
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest("[data-search-wrapper]")) {
        popover.classList.remove("is-open");
      }
    });
  }

  /* ---------- Cart drawer (AJAX) ---------- */
  var cartDrawerBody = document.querySelector("[data-cart-drawer-body]");

  function formatMoney(cents) {
    return (Shopify && Shopify.formatMoney) ? Shopify.formatMoney(cents, window.themeMoneyFormat) : "₹" + (cents / 100).toFixed(2);
  }

  function refreshCartDrawer(cart) {
    var countEls = document.querySelectorAll("[data-cart-count]");
    countEls.forEach(function (el) {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
    if (!cartDrawerBody) return;
    if (cart.item_count === 0) {
      cartDrawerBody.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><a href="/collections/all" class="btn btn-primary" data-drawer-close>Start shopping</a></div>';
    } else {
      var lines = cart.items
        .map(function (item) {
          return (
            '<div class="cart-line" data-line-key="' + item.key + '">' +
            '<img class="cart-line__img" src="' + item.image + '&width=160" alt="" loading="lazy">' +
            "<div>" +
            '<div class="cart-line__title">' + item.product_title + "</div>" +
            (item.variant_title ? '<div class="cart-line__variant">' + item.variant_title + "</div>" : "") +
            '<div class="qty-stepper" data-qty-stepper>' +
            '<button type="button" data-qty-decrease aria-label="Decrease quantity">−</button>' +
            '<input type="text" value="' + item.quantity + '" readonly>' +
            '<button type="button" data-qty-increase aria-label="Increase quantity">+</button>' +
            "</div>" +
            '<a href="#" class="cart-line__remove" data-cart-remove>Remove</a>' +
            "</div>" +
            '<div class="price">' + formatMoney(item.final_line_price) + "</div>" +
            "</div>"
          );
        })
        .join("");
      cartDrawerBody.innerHTML = lines;
    }
    var subtotalEl = document.querySelector("[data-cart-subtotal]");
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
    var fillEl = document.querySelector("[data-free-shipping-fill]");
    var msgEl = document.querySelector("[data-free-shipping-msg]");
    if (fillEl && msgEl) {
      var threshold = parseInt(fillEl.getAttribute("data-threshold"), 10) * 100;
      var pct = Math.min(100, (cart.total_price / threshold) * 100);
      fillEl.style.width = pct + "%";
      if (cart.total_price >= threshold) {
        msgEl.textContent = "You've unlocked free shipping!";
      } else {
        msgEl.textContent = formatMoney(threshold - cart.total_price) + " away from free shipping";
      }
    }
  }

  function fetchCart() {
    return fetch("/cart.js").then(function (r) { return r.json(); });
  }

  document.addEventListener("submit", function (e) {
    var form = e.target.closest('form[action*="/cart/add"]');
    if (!form) return;
    e.preventDefault();
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = "Adding…"; }
    fetch("/cart/add.js", { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function () { return fetchCart(); })
      .then(function (cart) {
        refreshCartDrawer(cart);
        var drawer = document.getElementById("cart-drawer");
        if (drawer) openDrawer(drawer);
      })
      .catch(function () {})
      .finally(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
      });
  });

  document.addEventListener("click", function (e) {
    var stepper = e.target.closest("[data-qty-increase],[data-qty-decrease]");
    if (stepper) {
      var line = stepper.closest("[data-line-key]");
      var input = line.querySelector("input");
      var qty = parseInt(input.value, 10) + (stepper.hasAttribute("data-qty-increase") ? 1 : -1);
      if (qty < 0) qty = 0;
      fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: line.getAttribute("data-line-key"), quantity: qty }),
      })
        .then(function (r) { return r.json(); })
        .then(refreshCartDrawer);
    }
    var removeBtn = e.target.closest("[data-cart-remove]");
    if (removeBtn) {
      e.preventDefault();
      var line2 = removeBtn.closest("[data-line-key]");
      fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: line2.getAttribute("data-line-key"), quantity: 0 }),
      })
        .then(function (r) { return r.json(); })
        .then(refreshCartDrawer);
    }
  });

  /* ---------- Variant selection (product page + quick add) ---------- */
  document.addEventListener("click", function (e) {
    var swatch = e.target.closest("[data-variant-swatch]");
    if (!swatch) return;
    var wrapper = swatch.closest("[data-variant-picker]");
    wrapper.querySelectorAll("[data-variant-swatch]").forEach(function (s) { s.classList.remove("is-selected"); });
    swatch.classList.add("is-selected");
    var variantId = swatch.getAttribute("data-variant-id");
    var input = wrapper.parentElement.querySelector('input[name="id"]');
    if (input) input.value = variantId;
    var priceEl = wrapper.closest("form").querySelector("[data-variant-price]");
    if (priceEl && swatch.getAttribute("data-variant-price")) {
      priceEl.textContent = swatch.getAttribute("data-variant-price");
    }
    var submit = wrapper.closest("form").querySelector('[type="submit"]');
    if (submit) {
      var available = swatch.getAttribute("data-variant-available") === "true";
      submit.disabled = !available;
      submit.textContent = available ? submit.getAttribute("data-add-text") : "Sold out";
    }
  });

  /* ---------- Sticky add-to-cart (product page, mobile) ---------- */
  var stickyAtc = document.querySelector("[data-sticky-atc]");
  var mainAtc = document.querySelector("[data-main-atc]");
  if (stickyAtc && mainAtc && "IntersectionObserver" in window) {
    var atcObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          stickyAtc.classList.toggle("is-visible", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    atcObserver.observe(mainAtc);
  }

  /* ---------- Product gallery thumbs ---------- */
  document.addEventListener("click", function (e) {
    var thumb = e.target.closest("[data-gallery-thumb]");
    if (!thumb) return;
    var gallery = thumb.closest("[data-product-gallery]");
    gallery.querySelectorAll("[data-gallery-thumb]").forEach(function (t) { t.classList.remove("is-active"); });
    thumb.classList.add("is-active");
    var mainImg = gallery.querySelector("[data-gallery-main-img]");
    if (mainImg) mainImg.src = thumb.getAttribute("data-full-src");
  });
})();
