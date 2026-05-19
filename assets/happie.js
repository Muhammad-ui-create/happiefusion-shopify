/* ============================================================
   HAPPIE FUNGI FUSION — SHOPIFY THEME JS
   ============================================================ */

(function() {
  'use strict';

  /* ── Cart state ── */
  var cartCount = window.cartItemCount || 0;

  function updateCartBadge(count) {
    cartCount = count;
    document.querySelectorAll('.cart-count-badge').forEach(function(el) {
      el.textContent = count;
    });
  }

  /* ── Mobile Nav ── */
  var hamburger = document.getElementById('hamburger');
  var mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', function() {
      mobileNav.classList.toggle('open');
    });
  }

  /* ── Cart Drawer ── */
  var cartDrawer    = document.getElementById('cart-drawer');
  var cartTrigger   = document.getElementById('cart-trigger');
  var cartClose     = document.querySelector('.cart-drawer-close');
  var cartOverlay   = document.querySelector('.cart-drawer-overlay');
  var cartBody      = document.getElementById('cart-drawer-body');
  var cartSubtotal  = document.getElementById('cart-subtotal-price');

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('open');
    if (window.lenis) window.lenis.stop();
    else document.body.style.overflow = 'hidden';
    fetchCart();
  }
  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('open');
    if (window.lenis) window.lenis.start();
    else document.body.style.overflow = '';
  }

  if (cartTrigger) cartTrigger.addEventListener('click', openCart);
  if (cartClose)   cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function fetchCart() {
    fetch('/cart.js')
      .then(function(r) { return r.json(); })
      .then(function(cart) {
        updateCartBadge(cart.item_count);
        if (cartSubtotal) cartSubtotal.textContent = formatMoney(cart.total_price);
        renderCartDrawer(cart);
      });
  }

  function renderCartDrawer(cart) {
    if (!cartBody) return;
    if (cart.item_count === 0) {
      cartBody.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
      return;
    }
    var html = '';
    cart.items.forEach(function(item) {
      html += '<div class="cart-item" style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid rgba(0,0,0,0.07);">'
        + '<img src="' + item.image + '" style="width:72px;height:72px;object-fit:cover;border-radius:10px;flex-shrink:0;" />'
        + '<div style="flex:1;">'
        + '<div style="font-weight:700;font-size:14px;">' + item.product_title + '</div>'
        + '<div style="font-size:12px;color:#888;">' + item.variant_title + '</div>'
        + (item.selling_plan_allocation ? '<div style="font-size:12px;color:#2D6A4F;font-weight:600;">Subscribe & Save</div>' : '')
        + '<div style="display:flex;align-items:center;gap:10px;margin-top:8px;">'
        + '<button onclick="changeCartQty(\'' + item.key + '\',' + (item.quantity - 1) + ')" style="width:26px;height:26px;border-radius:50%;background:#d8f3dc;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;">−</button>'
        + '<span style="font-weight:700;">' + item.quantity + '</span>'
        + '<button onclick="changeCartQty(\'' + item.key + '\',' + (item.quantity + 1) + ')" style="width:26px;height:26px;border-radius:50%;background:#d8f3dc;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;">+</button>'
        + '</div>'
        + '</div>'
        + '<div style="font-weight:800;font-size:14px;flex-shrink:0;">' + formatMoney(item.line_price) + '</div>'
        + '</div>';
    });
    cartBody.innerHTML = html;
    if (cartSubtotal) cartSubtotal.textContent = formatMoney(cart.total_price);
  }

  window.changeCartQty = function(key, qty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(function(r) { return r.json(); }).then(function(cart) {
      updateCartBadge(cart.item_count);
      renderCartDrawer(cart);
      if (cartSubtotal) cartSubtotal.textContent = formatMoney(cart.total_price);
    });
  };

  /* ── Add to Cart (product cards) ── */
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-add-to-cart');
    if (!btn) return;
    var variantId = btn.dataset.variantId;
    if (!variantId) return;
    btn.textContent = 'Adding…';
    btn.disabled = true;
    addToCart(variantId, 1, null, function() {
      btn.textContent = '✓ Added!';
      setTimeout(function() {
        btn.textContent = '+ Add to Cart';
        btn.disabled = false;
      }, 1500);
      openCart();
    });
  });

  function addToCart(variantId, qty, sellingPlanId, cb) {
    var body = { id: variantId, quantity: qty || 1 };
    if (sellingPlanId) body.selling_plan = sellingPlanId;
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); }).then(function() {
      fetchCart();
      if (cb) cb();
    });
  }

  /* ── Product Page ── */
  if (document.getElementById('product-form')) {
    initProductPage();
  }

  function initProductPage() {
    var variants  = (window.productData && window.productData.variants) || [];
    var mainImg   = document.getElementById('gallery-main-img');
    var priceEl   = document.getElementById('product-price');
    var variantInput = document.getElementById('variant-id');
    var atcBtn    = document.getElementById('add-to-cart-btn');
    var atcText   = document.getElementById('atc-text');
    var qtyInput  = document.getElementById('qty-input');
    var qtyMinus  = document.getElementById('qty-minus');
    var qtyPlus   = document.getElementById('qty-plus');
    var onetimePrice = document.getElementById('onetime-price');

    var selectedSellingPlanId = null;

    /* Gallery thumbnails */
    var thumbs = document.querySelectorAll('.gallery-thumb');
    var allSrcs = [];
    thumbs.forEach(function(t) {
      allSrcs.push(t.dataset.src);
      t.addEventListener('click', function() {
        if (mainImg) { mainImg.style.opacity = '0'; setTimeout(function() { mainImg.src = t.dataset.src; mainImg.style.opacity = '1'; }, 150); }
        thumbs.forEach(function(x) { x.classList.remove('active'); });
        t.classList.add('active');
      });
    });

    /* Gallery arrows */
    var currentImgIdx = 0;
    var prevBtn = document.getElementById('gallery-prev');
    var nextBtn = document.getElementById('gallery-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        currentImgIdx = (currentImgIdx - 1 + allSrcs.length) % allSrcs.length;
        if (mainImg) { mainImg.style.opacity = '0'; setTimeout(function() { mainImg.src = allSrcs[currentImgIdx]; mainImg.style.opacity = '1'; }, 150); }
        thumbs.forEach(function(t,i) { t.classList.toggle('active', i === currentImgIdx); });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        currentImgIdx = (currentImgIdx + 1) % allSrcs.length;
        if (mainImg) { mainImg.style.opacity = '0'; setTimeout(function() { mainImg.src = allSrcs[currentImgIdx]; mainImg.style.opacity = '1'; }, 150); }
        thumbs.forEach(function(t,i) { t.classList.toggle('active', i === currentImgIdx); });
      });
    }

    /* Variant pills */
    document.querySelectorAll('.variant-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        pill.closest('.variant-pills').querySelectorAll('.variant-pill').forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
        var label = pill.closest('.variant-group').querySelector('.variant-label strong');
        if (label) label.textContent = pill.dataset.value;
        updateSelectedVariant();
      });
    });

    function getSelectedOptions() {
      var opts = [];
      document.querySelectorAll('.variant-pills').forEach(function(group) {
        var active = group.querySelector('.variant-pill.active');
        if (active) opts.push(active.dataset.value);
      });
      return opts;
    }

    function updateSelectedVariant() {
      var opts = getSelectedOptions();
      var match = variants.find(function(v) {
        if (opts.length === 0) return true;
        if (opts.length >= 1 && v.option1 !== opts[0]) return false;
        if (opts.length >= 2 && v.option2 !== opts[1]) return false;
        if (opts.length >= 3 && v.option3 !== opts[2]) return false;
        return true;
      });
      if (match) {
        if (variantInput) variantInput.value = match.id;
        var price = selectedSellingPlanId ? getSellingPlanPrice(match, selectedSellingPlanId) : match.price;
        if (priceEl) priceEl.textContent = formatMoney(price);
        if (!match.available) {
          if (atcBtn) atcBtn.disabled = true;
          if (atcText) atcText.innerHTML = 'Sold Out';
        } else {
          if (atcBtn) atcBtn.disabled = false;
          if (atcText) atcText.innerHTML = 'ADD TO CART – ' + formatMoney(price);
        }
        if (onetimePrice) onetimePrice.textContent = formatMoney(match.price);
      }
    }

    function getSellingPlanPrice(variant, planId) {
      if (!variant.selling_plan_allocations) return variant.price;
      var alloc = variant.selling_plan_allocations.find(function(a) { return a.selling_plan_id == planId; });
      return alloc ? alloc.price : variant.price;
    }

    /* Selling plan */
    document.querySelectorAll('input[name="selling_plan"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        selectedSellingPlanId = radio.value || null;
        document.querySelectorAll('.purchase-option').forEach(function(opt) {
          opt.classList.toggle('active', opt.contains(radio));
        });
        updateSelectedVariant();
      });
    });

    /* Qty stepper */
    if (qtyMinus) qtyMinus.addEventListener('click', function() { var v = parseInt(qtyInput.value)||1; if (v>1) qtyInput.value = v-1; });
    if (qtyPlus)  qtyPlus.addEventListener('click',  function() { var v = parseInt(qtyInput.value)||1; qtyInput.value = v+1; });

    /* Add to cart submit */
    var form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var varId = variantInput ? variantInput.value : null;
        var qty   = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
        if (!varId) return;
        if (atcBtn) atcBtn.disabled = true;
        if (atcText) atcText.innerHTML = 'Adding…';
        addToCart(varId, qty, selectedSellingPlanId, function() {
          if (atcText) atcText.innerHTML = '✓ Added to Cart!';
          setTimeout(function() { if (atcBtn) atcBtn.disabled = false; updateSelectedVariant(); }, 1500);
          openCart();
        });
      });
    }
  }

  /* ── Smooth Accordions ── */
  function initSmoothAccordions() {
    document.querySelectorAll('.accordion-trigger').forEach(function(btn) {
      var acc  = btn.closest('.accordion');
      var body = acc.querySelector('.accordion-body');
      if (!body) return;
      body.style.maxHeight  = '0px';
      body.style.overflow   = 'hidden';
      body.style.display    = 'block';
      body.style.transition = 'max-height 0.5s cubic-bezier(0.16,1,0.3,1)';

      btn.addEventListener('click', function() {
        var isOpen = acc.classList.contains('open');
        acc.parentElement.querySelectorAll('.accordion.open').forEach(function(o) {
          if (o !== acc) { o.classList.remove('open'); o.querySelector('.accordion-body').style.maxHeight = '0px'; }
        });
        acc.classList.toggle('open', !isOpen);
        body.style.maxHeight = isOpen ? '0px' : body.scrollHeight + 'px';
      });
    });
  }

  /* ── Flavor Swatches ── */
  document.querySelectorAll('.flavor-swatch').forEach(function(btn) {
    btn.addEventListener('click', function() {
      btn.closest('.variant-swatches').querySelectorAll('.flavor-swatch').forEach(function(s) { s.classList.remove('active'); });
      btn.classList.add('active');
      var label = document.getElementById('selected-flavor-label');
      if (label) label.textContent = btn.dataset.value;
    });
  });

  /* ── Scroll Reveal ── */
  function initScrollReveal() {
    var selectors = [
      '.product-card', '.benefit-card', '.review-card', '.section-header',
      '.sci-stat', '.sci-compound-card', '.sci-extract-card',
      '.comparison-left', '.comparison-table', '.hero-pill', '.mush-benefit'
    ];
    selectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', (i * 70) + 'ms');
      });
    });
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.reveal').forEach(function(el) { io.observe(el); });
  }

  /* ══════════════════════════════════════════
     LENIS PREMIUM SMOOTH SCROLL
  ══════════════════════════════════════════ */
  function initLenis() {
    if (typeof Lenis === 'undefined') return;

    var lenis = new Lenis({
      duration: 1.4,
      easing: function(t) {
        // Expo ease-out — snappy start, silky deceleration
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      },
      smoothWheel: true,
      smoothTouch: false,   // native touch scroll is already smooth
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      infinite: false,
    });

    window.lenis = lenis;

    /* RAF loop */
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    /* Scroll-driven effects */
    var can = document.querySelector('.hero-can-img');
    var nav = document.querySelector('.nav');

    lenis.on('scroll', function(e) {
      var s = e.scroll;

      // Hero parallax
      if (can) can.style.transform = 'translateY(' + (s * 0.14) + 'px)';

      // Nav shadow
      if (nav) nav.classList.toggle('scrolled', s > 10);
    });

    /* Pause during modal/cart */
    document.addEventListener('cart:open',  function() { lenis.stop(); });
    document.addEventListener('cart:close', function() { lenis.start(); });
  }

  /* ── Init ── */
  initSmoothAccordions();
  initScrollReveal();
  initLenis();

})();
