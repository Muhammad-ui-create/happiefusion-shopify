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
    document.body.style.overflow = 'hidden';
    fetchCart();
  }
  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('open');
    document.body.style.overflow = '';
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
    var atcPriceEl = document.getElementById('atc-price');
    var variantInput = document.getElementById('variant-id');
    var atcBtn    = document.getElementById('add-to-cart-btn');
    var atcText   = document.getElementById('atc-text');
    var qtyInput  = document.getElementById('qty-input');
    var qtyMinus  = document.getElementById('qty-minus');
    var qtyPlus   = document.getElementById('qty-plus');
    var onetimePrice = document.getElementById('onetime-price');

    var selectedOptions = [];
    var selectedSellingPlanId = null;

    /* Gallery thumbnails */
    var thumbs = document.querySelectorAll('.gallery-thumb');
    var allSrcs = [];
    thumbs.forEach(function(t, i) {
      allSrcs.push(t.dataset.src);
      t.addEventListener('click', function() {
        if (mainImg) mainImg.src = t.dataset.src;
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
        if (mainImg) mainImg.src = allSrcs[currentImgIdx];
        thumbs.forEach(function(t,i) { t.classList.toggle('active', i === currentImgIdx); });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        currentImgIdx = (currentImgIdx + 1) % allSrcs.length;
        if (mainImg) mainImg.src = allSrcs[currentImgIdx];
        thumbs.forEach(function(t,i) { t.classList.toggle('active', i === currentImgIdx); });
      });
    }

    /* Variant pills */
    document.querySelectorAll('.variant-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        var optionIdx = parseInt(pill.dataset.optionIndex);
        var value = pill.dataset.value;
        // Update active state within same group
        pill.closest('.variant-pills').querySelectorAll('.variant-pill').forEach(function(p) {
          p.classList.remove('active');
        });
        pill.classList.add('active');
        // Update label
        var label = pill.closest('.variant-group').querySelector('.variant-label strong');
        if (label) label.textContent = value;
        // Find matching variant
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
        var price = selectedSellingPlanId
          ? getSellingPlanPrice(match, selectedSellingPlanId)
          : match.price;
        updatePriceDisplay(price, match.price);
        if (!match.available) {
          if (atcBtn) atcBtn.disabled = true;
          if (atcText) atcText.innerHTML = 'Sold Out';
        } else {
          if (atcBtn) atcBtn.disabled = false;
          updateAtcText(price);
        }
        if (onetimePrice) onetimePrice.textContent = formatMoney(match.price);
      }
    }

    function getSellingPlanPrice(variant, planId) {
      if (!variant.selling_plan_allocations) return variant.price;
      var alloc = variant.selling_plan_allocations.find(function(a) { return a.selling_plan_id == planId; });
      return alloc ? alloc.price : variant.price;
    }

    function updatePriceDisplay(price, comparePrice) {
      if (priceEl) priceEl.textContent = formatMoney(price);
    }

    function updateAtcText(price) {
      if (atcText) atcText.innerHTML = 'ADD TO CART – ' + formatMoney(price);
    }

    /* Selling plan (subscribe & save) */
    document.querySelectorAll('input[name="selling_plan"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        var planId = radio.value || null;
        selectedSellingPlanId = planId;
        // Update option label active state
        document.querySelectorAll('.purchase-option').forEach(function(opt) {
          opt.classList.toggle('active', opt.contains(radio));
        });
        updateSelectedVariant();
      });
    });

    /* Qty stepper */
    if (qtyMinus) {
      qtyMinus.addEventListener('click', function() {
        var val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
      });
    }
    if (qtyPlus) {
      qtyPlus.addEventListener('click', function() {
        var val = parseInt(qtyInput.value) || 1;
        qtyInput.value = val + 1;
      });
    }

    /* Add to cart submit */
    var form = document.getElementById('product-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var varId = variantInput ? variantInput.value : null;
        var qty   = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
        var planId = selectedSellingPlanId;
        if (!varId) return;
        if (atcBtn) atcBtn.disabled = true;
        if (atcText) atcText.innerHTML = 'Adding…';
        addToCart(varId, qty, planId, function() {
          if (atcText) atcText.innerHTML = '✓ Added to Cart!';
          setTimeout(function() {
            if (atcBtn) atcBtn.disabled = false;
            updateSelectedVariant();
          }, 1500);
          openCart();
        });
      });
    }
  }

  /* ── Accordions ── */
  document.querySelectorAll('.accordion-trigger').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var acc = btn.closest('.accordion');
      acc.classList.toggle('open');
    });
  });

  /* ── Scroll Reveal ── */
  function initScrollReveal() {
    // Auto-tag elements for reveal
    var selectors = [
      '.product-card',
      '.benefit-card',
      '.review-card',
      '.section-header',
      '.sci-stat',
      '.sci-compound-card',
      '.sci-extract-card',
      '.comparison-left',
      '.comparison-table',
      '.hero-pill',
      '.mush-benefit',
      '.accordion'
    ];
    selectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay', (i * 80) + 'ms');
      });
    });

    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function(el) {
      io.observe(el);
    });
  }

  /* ── Hero Parallax ── */
  function initParallax() {
    var can = document.querySelector('.hero-can-img');
    if (!can) return;
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          var scrollY = window.scrollY;
          can.style.transform = 'translateY(' + (scrollY * 0.18) + 'px)';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── Smooth Accordion ── */
  function initSmoothAccordions() {
    document.querySelectorAll('.accordion-trigger').forEach(function(btn) {
      var acc = btn.closest('.accordion');
      var body = acc.querySelector('.accordion-body');
      if (!body) return;
      // Set initial state
      body.style.maxHeight = '0px';
      body.style.overflow = 'hidden';
      body.style.display = 'block';

      btn.addEventListener('click', function() {
        var isOpen = acc.classList.contains('open');
        // Close all siblings
        var parent = acc.parentElement;
        parent.querySelectorAll('.accordion.open').forEach(function(openAcc) {
          if (openAcc !== acc) {
            openAcc.classList.remove('open');
            var ob = openAcc.querySelector('.accordion-body');
            if (ob) ob.style.maxHeight = '0px';
          }
        });
        // Toggle current
        acc.classList.toggle('open', !isOpen);
        body.style.maxHeight = isOpen ? '0px' : body.scrollHeight + 'px';
      });
    });
  }

  /* ── Flavor Swatch active update ── */
  document.querySelectorAll('.flavor-swatch').forEach(function(btn) {
    btn.addEventListener('click', function() {
      btn.closest('.variant-swatches').querySelectorAll('.flavor-swatch').forEach(function(s) {
        s.classList.remove('active');
      });
      btn.classList.add('active');
      var label = document.getElementById('selected-flavor-label');
      if (label) label.textContent = btn.dataset.value;
    });
  });

  /* ── Nav scroll shadow ── */
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ── Init ── */
  initScrollReveal();
  initParallax();
  initSmoothAccordions();

})();
