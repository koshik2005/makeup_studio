import { $, $$, esc, opt, api, uploadImage, toast, fmtDate } from './shared.js';

const FALLBACK = {
  content: {
    brandName: 'Glow & Grace',
    tagline: 'Makeup · Blouse Designing · Embroidery',
    heroTitle: 'Beauty, crafted with every stroke & stitch',
    heroSubtitle: 'Bridal and party makeup, custom blouse designing and hand embroidery.',
    aboutTitle: 'Hello, I’m your artist',
    aboutText: '',
    stats: [],
  },
  services: [],
  gallery: [],
  reviews: [],
  rating: { avg: 0, count: 0 },
};

const state = { site: FALLBACK, filter: 'All', lb: { items: [], i: 0 } };

async function init() {
  $('#year').textContent = new Date().getFullYear();
  setupNav();
  setupReveal();
  setupLightbox();
  setupReviewForm();
  setupContactForm();

  try {
    state.site = await api('/api/site');
  } catch {
    toast('Could not load the latest content. Please refresh.', 'err');
  }
  render();
}

/* ---------------- Render ---------------- */
function render() {
  const { content: c, services, reviews, rating } = state.site;

  document.title = `${c.brandName} — Makeup Artist, Blouse Designing & Embroidery`;
  $$('[data-bind]').forEach((el) => {
    if (c[el.dataset.bind] != null) el.textContent = c[el.dataset.bind];
  });

  // Hero + about artwork
  const mono = `<span class="mono">${esc((c.brandName || 'G').trim().charAt(0))}</span>`;
  $('#heroArt').innerHTML = c.heroImage
    ? `<img src="${opt(c.heroImage, 900)}" alt="${esc(c.brandName)}" fetchpriority="high" />`
    : mono;
  $('#aboutArt').innerHTML = c.aboutImage
    ? `<img loading="lazy" src="${opt(c.aboutImage, 900)}" alt="About ${esc(c.brandName)}" />`
    : mono;

  $('#aboutText').innerHTML = String(c.aboutText || '')
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');

  $('#stats').innerHTML = (c.stats || [])
    .map((s) => `<div><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`)
    .join('');

  // Services
  $('#serviceGrid').innerHTML = services
    .map(
      (s, i) => `
      <article class="card service reveal" style="--d:${i * 90}ms">
        ${
          s.image
            ? `<div class="s-img"><img loading="lazy" src="${opt(s.image, 700)}" alt="${esc(s.title)}" /></div>`
            : `<div class="s-ico">${['✦', '❀', '✧', '❖', '❁', '✺'][i % 6]}</div>`
        }
        <div class="s-body"><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p></div>
      </article>`
    )
    .join('');

  $('#cService').innerHTML =
    `<option value="">Select a service</option>` +
    services.map((s) => `<option>${esc(s.title)}</option>`).join('') +
    `<option>Something else</option>`;

  renderGallery();
  renderReviews(reviews, rating);
  renderContact(c);
  observeReveals();
}

function renderGallery() {
  const items = state.site.gallery;
  const cats = ['All', ...new Set(items.map((g) => g.category).filter(Boolean))];
  $('#chips').innerHTML =
    cats.length > 2
      ? cats.map((c) => `<button class="chip ${c === state.filter ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')
      : '';
  const list = state.filter === 'All' ? items : items.filter((g) => g.category === state.filter);

  $('#galleryGrid').innerHTML = list.length
    ? list
        .map(
          (g, i) => `
        <figure class="g-item" data-i="${i}" style="animation-delay:${Math.min(i, 12) * 50}ms">
          <img loading="lazy" src="${opt(g.url, 800)}" alt="${esc(g.title || g.category)}" />
          ${g.title ? `<figcaption>${esc(g.title)}</figcaption>` : ''}
        </figure>`
        )
        .join('')
    : `<p class="empty">Portfolio coming soon ✦</p>`;

  $('#galleryGrid').onclick = (e) => {
    const fig = e.target.closest('.g-item');
    if (!fig) return;
    openLightbox(
      list.map((g) => ({ url: g.url, caption: g.title })),
      Number(fig.dataset.i)
    );
  };
  $('#chips').onclick = (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    state.filter = b.dataset.cat;
    renderGallery();
  };
}

const starsHtml = (n) =>
  `<span class="stars" aria-label="${n} out of 5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;

function renderReviews(reviews, rating) {
  $('#ratingSummary').innerHTML = rating.count
    ? `<span class="big">${rating.avg.toFixed(1)}</span><div>${starsHtml(Math.round(rating.avg))}<div class="muted">Based on ${rating.count} review${rating.count > 1 ? 's' : ''}</div></div>`
    : `<span class="muted">No reviews yet — be the first to share your experience.</span>`;

  $('#reviewList').innerHTML = reviews
    .map(
      (r, i) => `
    <article class="review reveal" style="--d:${(i % 6) * 70}ms">
      ${starsHtml(r.rating)}
      <p>${esc(r.content)}</p>
      ${r.image?.url ? `<div class="r-img" data-img="${esc(r.image.url)}" data-who="${esc(r.name)}"><img loading="lazy" src="${opt(r.image.url, 600)}" alt="Photo shared by ${esc(r.name)}" /></div>` : ''}
      <div class="who"><span class="avatar">${esc(r.name.charAt(0).toUpperCase())}</span><div><strong>${esc(r.name)}</strong><small>${fmtDate(r.createdAt)}</small></div></div>
    </article>`
    )
    .join('');

  $('#reviewList').onclick = (e) => {
    const box = e.target.closest('.r-img');
    if (box) openLightbox([{ url: box.dataset.img, caption: `Shared by ${box.dataset.who}` }], 0);
  };
}

function renderContact(c) {
  const li = (icon, label, html) =>
    `<li><span class="ic">${icon}</span><div><small>${label}</small>${html}</div></li>`;
  const items = [];
  if (c.phone) items.push(li('☎', 'Call', `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>`));
  if (c.whatsapp) items.push(li('✆', 'WhatsApp', `<a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">Chat with me</a>`));
  if (c.email) items.push(li('✉', 'Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`));
  if (c.address) items.push(li('⌖', 'Studio', `<span>${esc(c.address)}</span>`));
  if (c.hours) items.push(li('◷', 'Hours', `<span>${esc(c.hours)}</span>`));
  $('#contactList').innerHTML = items.join('');

  const insta = c.instagramUrl || 'https://www.instagram.com/';
  $('#instaCard').href = insta;
  $('#footInsta').href = insta;
  $('#instaHandle').textContent = c.instagramHandle || 'Instagram';

  const wa = $('#waFloat');
  if (c.whatsapp) {
    wa.href = `https://wa.me/${c.whatsapp}`;
    wa.hidden = false;
  } else wa.hidden = true;
}

/* ---------------- Nav, reveal, lightbox ---------------- */
function setupNav() {
  const nav = $('#nav');
  const burger = $('#burger');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const close = () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Smooth in-page navigation (also covers Safari)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    close();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
  });

  // Highlight the section in view
  const links = $$('#menu a');
  const spy = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${en.target.id}`));
      }),
    { rootMargin: '-45% 0px -50% 0px' }
  );
  $$('main section[id]').forEach((s) => spy.observe(s));
}

let revealObs;
function setupReveal() {
  revealObs = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          revealObs.unobserve(en.target);
        }
      }),
    { threshold: 0.12 }
  );
  observeReveals();
}
function observeReveals() {
  $$('.reveal:not(.in)').forEach((el) => revealObs.observe(el));
}

function setupLightbox() {
  const lb = $('#lightbox');
  const show = () => {
    const it = state.lb.items[state.lb.i];
    $('#lbImg').src = opt(it.url, 1600);
    $('#lbCap').textContent = it.caption || '';
    const multi = state.lb.items.length > 1;
    $$('.lb-nav', lb).forEach((b) => (b.hidden = !multi));
  };
  const step = (d) => {
    const n = state.lb.items.length;
    state.lb.i = (state.lb.i + d + n) % n;
    show();
  };
  const close = () => {
    lb.hidden = true;
    document.body.style.overflow = '';
  };
  openLightbox = (items, i) => {
    state.lb = { items, i };
    show();
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  $('.lb-close', lb).onclick = close;
  $('.prev', lb).onclick = () => step(-1);
  $('.next', lb).onclick = () => step(1);
  lb.addEventListener('click', (e) => e.target === lb && close());
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}
let openLightbox = () => {};

/* ---------------- Review form ---------------- */
function setupReviewForm() {
  const form = $('#reviewForm');
  const file = $('#rvFile');
  const preview = $('#rvPreview');
  const text = $('#rvDropText');
  const remove = $('#rvRemove');

  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast('Please choose an image file.', 'err');
      file.value = '';
      return;
    }
    preview.src = URL.createObjectURL(f);
    preview.hidden = false;
    remove.hidden = false;
    text.textContent = f.name;
  });
  remove.addEventListener('click', () => {
    file.value = '';
    preview.hidden = true;
    remove.hidden = true;
    text.textContent = '＋ Choose a photo';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      name: String(fd.get('name') || '').trim(),
      rating: Number(fd.get('rating')),
      content: String(fd.get('content') || '').trim(),
      website: fd.get('website'),
    };
    if (body.name.length < 2) return toast('Please enter your name.', 'err');
    if (!body.rating) return toast('Please choose a star rating.', 'err');
    if (body.content.length < 10) return toast('Please write a few words about your experience.', 'err');

    const btn = $('#rvSubmit');
    btn.disabled = true;
    btn.textContent = file.files[0] ? 'Uploading photo…' : 'Posting…';
    try {
      if (file.files[0]) body.image = await uploadImage(file.files[0], { scope: 'review' });
      btn.textContent = 'Posting…';
      const res = await api('/api/reviews', { method: 'POST', body });
      form.reset();
      remove.click();
      toast(res.published ? 'Thank you! Your review is now live ♡' : 'Thank you! Your review will appear after approval ♡');
      if (res.published) {
        const reviews = await api('/api/reviews');
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1);
        state.site.reviews = reviews;
        state.site.rating = { avg, count: reviews.length };
        renderReviews(reviews, state.site.rating);
        observeReveals();
      }
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Post Review';
    }
  });
}

/* ---------------- Contact form ---------------- */
function setupContactForm() {
  const form = $('#contactForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    if (String(fd.name).trim().length < 2) return toast('Please enter your name.', 'err');
    if (String(fd.phone).replace(/\D/g, '').length < 7) return toast('Please enter a valid phone number.', 'err');
    if (String(fd.message).trim().length < 5) return toast('Please add a short message.', 'err');

    const btn = $('#cSubmit');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await api('/api/messages', { method: 'POST', body: fd });
      form.reset();
      toast('Message sent! I’ll get back to you soon ♡');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  });
}

/* ---------------- Start ---------------- */
// Called last so every module-level binding above is initialised first.
init();
