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

  /* ── Drawer mini-review rotator: crossfade through the review slides while
     the drawer is open. Only ticks when the drawer is visible — no idle work. ── */
  (function() {
    var track = document.querySelector('#cart-mini-review .cart-mini-review-track');
    if (!track) return;
    var slides = track.querySelectorAll('.cart-mini-slide');
    if (slides.length < 2) return;
    var idx = 0;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setInterval(function() {
      if (reduceMotion) return;
      if (!cartDrawer || !cartDrawer.classList.contains('open')) return;
      slides[idx].classList.remove('is-active');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('is-active');
    }, 4000);
  })();

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
      /* Line item properties (e.g. Build-Your-Own 18-Pack flavor mix) — show
         everything except _underscore-prefixed internals */
      var propsHtml = '';
      if (item.properties) {
        Object.keys(item.properties).forEach(function(k) {
          if (k.charAt(0) === '_' || !item.properties[k]) return;
          propsHtml += '<div class="cart-item-variant">' + k + ': ' + item.properties[k] + '</div>';
        });
      }
      /* Custom pack: surface the built-in bundle discount right on the line.
         Compare-at = the equivalent number of 6-packs (18 cans -> 3, 24 cans -> 4). */
      if (item.handle === 'build-your-own-fungi-fusion-18-pack') {
        var is24 = (item.variant_title || '').indexOf('24') !== -1;
        var byoCompare = is24 ? 9596 : 7197;
        var byoPacks = is24 ? 'four' : 'three';
        propsHtml += '<div class="cart-item-variant" style="color:#2D6A4F;font-weight:800;">'
          + 'You\'re saving ' + formatMoney(byoCompare - item.price) + ' vs ' + byoPacks + ' 6-packs 🎉</div>';
      }
      html += '<div class="cart-item">'
        + '<img src="' + item.image + '" alt="" class="cart-item-img" />'
        + '<div class="cart-item-info">'
        + '<div class="cart-item-title">' + item.product_title + '</div>'
        + '<div class="cart-item-variant">' + (item.variant_title || '') + '</div>'
        + propsHtml
        + (item.selling_plan_allocation ? '<div class="cart-item-sub">Subscribe &amp; Save</div>' : '')
        + '<div class="cart-item-qty">'
        + '<button type="button" onclick="changeCartQty(\'' + item.key + '\',' + (item.quantity - 1) + ')" aria-label="Decrease quantity">−</button>'
        + '<span>' + item.quantity + '</span>'
        + '<button type="button" onclick="changeCartQty(\'' + item.key + '\',' + (item.quantity + 1) + ')" aria-label="Increase quantity">+</button>'
        + '<button type="button" class="cart-item-remove" onclick="changeCartQty(\'' + item.key + '\',0)" aria-label="Remove item" title="Remove">×</button>'
        + '</div>'
        + '</div>'
        + '<div class="cart-item-price">' + formatMoney(item.line_price) + '</div>'
        + '</div>';
    });
    cartBody.innerHTML = html;
    if (cartSubtotal) cartSubtotal.textContent = formatMoney(cart.total_price);
    renderCartUpsell(cart);
  }

  /* ── Cart upsell: suggest a product the customer doesn't already have in cart ── */
  function renderCartUpsell(cart) {
    if (!cartBody) return;
    var existing = document.getElementById('cart-upsell');
    if (existing) existing.remove();
    // Catalog of suggestion candidates — the custom 18-pack is the AOV win, singles fill gaps.
    var candidates = [
      { handle: 'build-your-own-fungi-fusion-18-pack', title: 'Build Your Own Pack — 18 or 24 Cans', price: 5699, compare: 7197, save: 'Save up to $23.97', img: 'https://cdn.shopify.com/s/files/1/0725/4946/6177/files/hf_20260707_185319_dd3ac4cb-1de8-44cc-89ee-8c2692763dca.png?v=1783450693&width=200', tag: 'BEST VALUE' },
      { handle: 'blue-razzberry-fungi-powered-seltzer', title: 'Blue Razzberry — 6-Pack', price: 2399, img: 'https://cdn.shopify.com/s/files/1/0725/4946/6177/files/Main.webp?v=1778542878&width=200', tag: 'TOP SELLER' },
      { handle: 'mango-mimosa-fungi-powered-seltzer', title: 'Mango Mimosa — 6-Pack', price: 2399, img: 'https://cdn.shopify.com/s/files/1/0725/4946/6177/files/Main_1.webp?v=1778543565&width=200', tag: 'TROPICAL' },
      { handle: 'watermelon-fungi-powered-seltzer', title: 'Watermelon — 6-Pack', price: 2399, img: 'https://cdn.shopify.com/s/files/1/0725/4946/6177/files/Main_1_336f10d5-6961-4495-ba14-55ab4fb89e12.webp?v=1778544523&width=200', tag: 'SUMMER' }
    ];
    var inCart = {};
    cart.items.forEach(function(it) { if (it.handle) inCart[it.handle] = true; });
    var suggestion = candidates.find(function(c) { return !inCart[c.handle]; });
    if (!suggestion) return;

    var up = document.createElement('div');
    up.id = 'cart-upsell';
    up.className = 'cart-upsell';
    /* Price line — with strikethrough compare-at + savings note when the candidate has one */
    var priceHtml = '<div class="cart-upsell-price">' + formatMoney(suggestion.price);
    if (suggestion.compare) {
      priceHtml += ' <s style="font-weight:600;color:#9aa39c;font-size:12px;">' + formatMoney(suggestion.compare) + '</s>';
    }
    priceHtml += '</div>';
    if (suggestion.save) {
      priceHtml += '<div class="cart-upsell-save" style="font-size:11px;font-weight:800;color:#2D6A4F;">' + suggestion.save + ' vs single 6-packs</div>';
    }
    /* Whole card is the link — not just the + button */
    up.innerHTML =
      '<div class="cart-upsell-label">You might also like</div>' +
      '<a href="/products/' + suggestion.handle + '" class="cart-upsell-card" aria-label="View ' + suggestion.title + '">' +
        '<img src="' + suggestion.img + '" alt="" class="cart-upsell-img" />' +
        '<div class="cart-upsell-info">' +
          '<span class="cart-upsell-tag">' + suggestion.tag + '</span>' +
          '<div class="cart-upsell-title">' + suggestion.title + '</div>' +
          priceHtml +
        '</div>' +
        '<span class="cart-upsell-btn" aria-hidden="true">+</span>' +
      '</a>';
    cartBody.appendChild(up);
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
    addToCart(variantId, 1, null, function(err) {
      if (err) {
        btn.textContent = '+ Add to Cart';
        btn.disabled = false;
        return;
      }
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) {
      if (!r.ok) {
        return r.json().then(function(err) {
          throw new Error(err && err.description ? err.description : 'Sorry — we couldn\'t add that to your cart. Please try again.');
        }, function() {
          throw new Error('Network error. Please check your connection and try again.');
        });
      }
      return r.json();
    }).then(function() {
      fetchCart();
      if (cb) cb(null);
    }).catch(function(err) {
      showCartToast(err.message || 'Couldn\'t add to cart. Try again.', 'error');
      if (cb) cb(err);
    });
  }

  /* Lightweight toast for ATC feedback / errors */
  function showCartToast(message, kind) {
    var existing = document.getElementById('happie-cart-toast');
    if (existing) existing.remove();
    var t = document.createElement('div');
    t.id = 'happie-cart-toast';
    t.setAttribute('role', 'status');
    t.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);' +
      'background:' + (kind === 'error' ? '#C44545' : '#2D6A4F') + ';color:#fff;' +
      'padding:14px 22px;border-radius:50px;font-weight:700;font-size:14px;' +
      'box-shadow:0 12px 32px rgba(0,0,0,0.25);font-family:Inter,sans-serif;' +
      'z-index:10001;opacity:0;transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s;';
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(function() {
      t.style.transform = 'translateX(-50%) translateY(0)';
      t.style.opacity = '1';
    });
    setTimeout(function() {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(80px)';
      setTimeout(function() { t.remove(); }, 400);
    }, 3800);
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

    /* Swap the main gallery image. Must drop srcset/sizes first — while they're
       present the browser keeps re-resolving the responsive source and ignores
       the src we assign, so thumbnail/arrow swaps silently do nothing. */
    function setMainImg(src, fadeMs) {
      if (!mainImg) return;
      mainImg.removeAttribute('srcset');
      mainImg.removeAttribute('sizes');
      mainImg.style.opacity = '0';
      setTimeout(function() { mainImg.src = src; mainImg.style.opacity = '1'; }, fadeMs);
    }

    /* Gallery thumbnails */
    var thumbs = document.querySelectorAll('.gallery-thumb');
    var allSrcs = [];
    thumbs.forEach(function(t) {
      allSrcs.push(t.dataset.src);
      t.addEventListener('click', function() {
        setMainImg(t.dataset.src, 80);
        thumbs.forEach(function(x) { x.classList.remove('active'); });
        t.classList.add('active');
      });
    });

    /* Preload full-size gallery images so thumbnail clicks swap instantly.
       Desktop: after load + idle, like before. Mobile (coarse pointer): only on the
       first gallery touch — blind-preloading 8 × 900px images (~1.5MB) on a phone
       burns data and competes with everything else still loading on slow connections. */
    var galleryPreloaded = false;
    function preloadGallery() {
      if (galleryPreloaded) return;
      galleryPreloaded = true;
      allSrcs.forEach(function(src) {
        var img = new Image();
        img.decoding = 'async';
        img.src = src;
      });
    }
    var coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarsePointer) {
      var gallery = document.querySelector('.product-gallery');
      if (gallery) {
        ['touchstart', 'pointerdown'].forEach(function(evt) {
          gallery.addEventListener(evt, preloadGallery, { once: true, passive: true });
        });
      }
    } else if (document.readyState === 'complete') {
      ('requestIdleCallback' in window) ? requestIdleCallback(preloadGallery, {timeout: 1500}) : setTimeout(preloadGallery, 300);
    } else {
      window.addEventListener('load', function() {
        ('requestIdleCallback' in window) ? requestIdleCallback(preloadGallery, {timeout: 1500}) : setTimeout(preloadGallery, 300);
      }, {once: true});
    }

    /* Gallery arrows */
    var currentImgIdx = 0;
    var prevBtn = document.getElementById('gallery-prev');
    var nextBtn = document.getElementById('gallery-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        currentImgIdx = (currentImgIdx - 1 + allSrcs.length) % allSrcs.length;
        setMainImg(allSrcs[currentImgIdx], 150);
        thumbs.forEach(function(t,i) { t.classList.toggle('active', i === currentImgIdx); });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        currentImgIdx = (currentImgIdx + 1) % allSrcs.length;
        setMainImg(allSrcs[currentImgIdx], 150);
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
        addToCart(varId, qty, selectedSellingPlanId, function(err) {
          if (err) {
            if (atcText) atcText.innerHTML = 'ADD TO CART';
            if (atcBtn) atcBtn.disabled = false;
            updateSelectedVariant();
            return;
          }
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
