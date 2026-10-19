/* =========================================================
   SCHOOL ADMISSIONS LANDING — SHARED BEHAVIOUR
   Reads its settings from window.LANDING (set in each page).
   Forms post to Netlify Forms; an optional extra webhook
   (LANDING.formEndpoint) receives a copy of every enquiry.
   ========================================================= */
(function () {
  'use strict';

  var C = window.LANDING || {};
  var LEAD_KEY = 'landing.lead';
  var UTM_KEY = 'landing.utm';
  var UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; /* storage blocked: degrade quietly */ }
  }

  /* ---------- Footer year ---------- */
  all('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Contact links: filled from LANDING.phone / LANDING.whatsapp ----------
     <a data-contact="tel">, <a data-contact="wa">, and any [data-needs-contact] block
     stay hidden until the number is set, so the page never ships a dead link. */
  var waBase = C.whatsapp ? 'https://wa.me/' + C.whatsapp : '';
  all('[data-contact]').forEach(function (a) {
    var kind = a.getAttribute('data-contact');
    if (kind === 'tel' && C.phone) {
      a.href = 'tel:+' + C.phone.replace(/\D/g, '').replace(/^0/, '254');
      if (!a.textContent.trim()) a.textContent = C.phone;
    } else if (kind === 'wa' && waBase) {
      a.href = waBase + '?text=' + encodeURIComponent(a.getAttribute('data-text') || C.waIntro || '');
    } else {
      a.hidden = true;
    }
  });
  if (!C.phone) all('[data-needs-contact]').forEach(function (el) { el.hidden = true; });
  all('[data-phone-text]').forEach(function (el) { el.textContent = C.phone || ''; });

  /* ---------- Photo slots: images/<slot>.jpg, placeholder until it exists ---------- */
  all('figure.slot[data-slot]').forEach(function (fig, i) {
    var img = document.createElement('img');
    img.alt = (fig.getAttribute('data-label') || '').replace(/^[^:]*:\s*/, '').replace(/\s*\(.*\)$/, '');
    img.decoding = 'async';
    if (i > 1) img.loading = 'lazy';
    img.onload = function () { fig.classList.add('has-img'); };
    img.onerror = function () { img.remove(); };
    img.src = fig.getAttribute('data-src') || 'images/' + fig.getAttribute('data-slot') + '.jpg';
    fig.appendChild(img);
  });

  /* ---------- Meta Pixel ---------- */
  if (C.metaPixelId) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', C.metaPixelId);
    window.fbq('track', 'PageView');
  }
  function track(event, data) { if (window.fbq) window.fbq('track', event, data || {}); }

  /* ---------- Campaign attribution ---------- */
  var params = new URLSearchParams(location.search);
  var utm = store(UTM_KEY) || {};
  UTM_FIELDS.forEach(function (k) { if (params.get(k)) utm[k] = params.get(k); });
  store(UTM_KEY, utm);

  /* ---------- Thank-you page ---------- */
  var lead = store(LEAD_KEY);
  if (document.body.getAttribute('data-page') === 'thanks') {
    if (lead) {
      if (lead.name) all('[data-thanks-name]').forEach(function (el) { el.textContent = ', ' + lead.name; });
      all('[data-wa-continue]').forEach(function (a) { if (lead.wa) a.href = lead.wa; else a.hidden = true; });
      if (!lead.tracked) {
        track('Lead', { content_name: C.campaign });
        lead.tracked = true;
        store(LEAD_KEY, lead);
      }
    }
    return;
  }

  /* ---------- Registration form ---------- */
  all('form[data-register]').forEach(initForm);

  function initForm(form) {
    var card = form.closest('.form-card') || form.parentNode;
    var button = form.querySelector('[type=submit]');
    var buttonText = button ? button.textContent : '';

    // Hidden attribution fields (declared in the HTML so Netlify registers them).
    setHidden(form, 'campaign', C.campaign || '');
    setHidden(form, 'page_url', location.origin + location.pathname);
    UTM_FIELDS.forEach(function (k) { setHidden(form, k, utm[k] || ''); });

    // Conditional fields: data-show-when="name=Value A|Value B"
    var conditional = all('[data-show-when]', form);
    function updateConditional() {
      conditional.forEach(function (el) {
        var rule = el.getAttribute('data-show-when').split('=');
        var checked = form.querySelector('[name="' + rule[0] + '"]:checked');
        var input = form.elements[rule[0]];
        var value = checked ? checked.value : (input && input.value) || '';
        el.hidden = rule[1].split('|').indexOf(value) === -1;
      });
    }
    form.addEventListener('change', updateConditional);
    updateConditional();

    // Validate a field once touched, then live.
    form.addEventListener('focusout', function (e) {
      if (e.target.name && e.target.value) validate(e.target);
    });
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) validate(e.target);
    });
    form.addEventListener('change', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) validate(e.target);
    });

    var started = false;
    form.addEventListener('focusin', function () {
      if (!started) { started = true; track('InitiateCheckout', { content_name: C.campaign }); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(form);

      var firstBad = null;
      all('input, select, textarea', form).forEach(function (input) {
        if (input.closest('[hidden]') || input.type === 'hidden') return;
        if (!validate(input) && !firstBad) firstBad = input;
      });
      if (firstBad) { firstBad.focus(); return; }

      var name = (form.elements.parent_name && form.elements.parent_name.value.trim().split(/\s+/)[0]) || '';
      var record = { name: name, wa: whatsappLink(form), tracked: false };

      // Bots fill the honeypot; show them success and send nothing.
      if (form.elements.website && form.elements.website.value) { done(record); return; }

      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      var body = new URLSearchParams(new FormData(form)).toString();
      var headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

      var netlify = fetch('/', { method: 'POST', headers: headers, body: body })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return true; });
      var extra = C.formEndpoint
        ? fetch(C.formEndpoint, { method: 'POST', mode: 'no-cors', headers: headers, body: body })
            .then(function () { return true; }, function () { return false; })
        : Promise.resolve(false);

      Promise.all([netlify.catch(function () { return false; }), extra]).then(function (res) {
        if (res[0] || res[1]) { done(record); return; }
        if (button) { button.disabled = false; button.textContent = buttonText; }
        showError(form, record.wa);
      });
    });

    function done(record) {
      store(LEAD_KEY, record);
      if (C.thankYouUrl) { location.href = C.thankYouUrl; return; }
      record.tracked = true;
      store(LEAD_KEY, record);
      track('Lead', { content_name: C.campaign });
      all('[data-thanks-name]', card).forEach(function (el) { el.textContent = record.name ? ', ' + record.name : ''; });
      all('[data-wa-continue]', card).forEach(function (a) { if (record.wa) a.href = record.wa; else a.hidden = true; });
      card.classList.add('sent');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function setHidden(form, name, value) {
    var input = form.elements[name];
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  function validate(input) {
    var field = input.closest('.field');
    if (!field) return true;
    var ok = true;
    var value = (input.value || '').trim();

    if (input.type === 'radio') {
      var group = field.querySelectorAll('[name="' + input.name + '"]');
      var required = Array.prototype.some.call(group, function (r) { return r.required; });
      ok = !required || Array.prototype.some.call(group, function (r) { return r.checked; });
    } else if (input.type === 'checkbox') {
      ok = !input.required || input.checked;
    } else if (input.required && !value) {
      ok = false;
    } else if (input.type === 'email' && value) {
      ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    } else if (input.type === 'tel' && value) {
      var digits = value.replace(/\D/g, '');
      ok = /^(?:0|254)?[17]\d{8}$/.test(digits) || (/^\+/.test(value) && digits.length >= 9 && digits.length <= 15);
    }

    field.classList.toggle('invalid', !ok);
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  // WhatsApp hand-off with the enquiry summarised, so the admissions team has context.
  function whatsappLink(form) {
    var number = C.whatsapp;
    if (!number) {
      var a = document.querySelector('a[href*="wa.me/"]');
      number = a ? (a.href.match(/wa\.me\/(\d+)/) || [])[1] : '';
    }
    if (!number) return '';
    var lines = [], seen = {};
    all('[data-summary]', form).forEach(function (input) {
      if (seen[input.name] || input.closest('[hidden]')) return;
      if ((input.type === 'radio' || input.type === 'checkbox') && !input.checked) return;
      var value = (input.value || '').trim();
      if (!value) return;
      seen[input.name] = true;
      lines.push(input.getAttribute('data-summary') + ': ' + value);
    });
    var text = (C.waIntro || 'Hello ' + (C.school || '') + ', I would like to ask about admissions.') +
      (lines.length ? '\n\n' + lines.join('\n') : '');
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
  }

  function showError(form, wa) {
    var box = document.createElement('div');
    box.className = 'form-error';
    box.setAttribute('role', 'alert');
    box.innerHTML = 'Sorry, we couldn’t send that just now. Please try again' + (wa ? ', or <a href="' + wa +
      '" target="_blank" rel="noopener">send your details on WhatsApp</a>.' : '.');
    var submit = form.querySelector('[type=submit]');
    submit.parentNode.insertBefore(box, submit);
  }
  function clearError(form) { all('.form-error', form).forEach(function (el) { el.remove(); }); }

  /* ---------- Sticky mobile CTA hides while the form is on screen ---------- */
  var sticky = document.querySelector('.sticky-cta');
  var register = document.getElementById('register');
  if (sticky && register && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sticky.classList.toggle('away', entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(register);
  }
})();
