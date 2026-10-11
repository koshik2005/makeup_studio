import { $, $$, esc, opt, api as rawApi, uploadImage, toast, fmtDate } from './shared.js';

let token = sessionStorage.getItem('adm_token') || '';
let tab = 'content';

const api = (path, opts = {}) =>
  rawApi(path, { ...opts, token }).catch((err) => {
    if (err.status === 401) logout(true);
    throw err;
  });

/* ---------------- Auth ---------------- */
function showApp(on) {
  $('#login').hidden = on;
  $('#app').hidden = !on;
}
function logout(expired = false) {
  token = '';
  sessionStorage.removeItem('adm_token');
  showApp(false);
  if (expired) toast('Session expired — please sign in again.', 'err');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#loginBtn');
  btn.disabled = true;
  try {
    const res = await rawApi('/api/login', { method: 'POST', body: { password: $('#pw').value } });
    token = res.token;
    sessionStorage.setItem('adm_token', token);
    $('#pw').value = '';
    showApp(true);
    go('content');
    refreshPills();
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    btn.disabled = false;
  }
});
$('#logout').addEventListener('click', () => logout());

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) go(b.dataset.tab);
});

function go(name) {
  tab = name;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $('#panel').innerHTML = '<p class="empty">Loading…</p>';
  ({ content: viewContent, services: viewServices, gallery: viewGallery, reviews: viewReviews, messages: viewMessages })[name]();
}

async function refreshPills() {
  try {
    const [reviews, msgs] = await Promise.all([api('/api/reviews?all=1'), api('/api/messages')]);
    const hidden = reviews.filter((r) => r.status === 'hidden').length;
    const unread = msgs.filter((m) => !m.read).length;
    setPill('#pillReviews', hidden);
    setPill('#pillMessages', unread);
  } catch {
    /* ignore */
  }
}
function setPill(sel, n) {
  const el = $(sel);
  el.textContent = n;
  el.hidden = !n;
}

const stars = (n) => `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;

/* ---------------- Reusable image picker ---------------- */
// Returns html; call bindImagePickers(root) afterwards. Current value kept in data-url / data-pid.
function imagePicker(name, label, url = '', pid = '') {
  return `
  <div class="field" data-picker="${name}" data-url="${esc(url)}" data-pid="${esc(pid)}">
    <label>${esc(label)}</label>
    <div class="img-pick">
      <div class="thumb">${url ? `<img src="${opt(url, 300)}" alt="" />` : 'No image'}</div>
      <div class="acts">
        <span class="btn btn-ghost sm filebtn">${url ? 'Change image' : 'Upload image'}<input type="file" accept="image/*" /></span>
        <button type="button" class="link" data-remove ${url ? '' : 'hidden'}>Remove</button>
      </div>
    </div>
  </div>`;
}
function bindImagePickers(root) {
  $$('[data-picker]', root).forEach((p) => {
    const thumb = $('.thumb', p);
    const input = $('input[type=file]', p);
    const label = $('.filebtn', p).firstChild;
    const rm = $('[data-remove]', p);
    const set = (url, pid) => {
      p.dataset.url = url;
      p.dataset.pid = pid;
      thumb.innerHTML = url ? `<img src="${opt(url, 300)}" alt="" />` : 'No image';
      label.textContent = url ? 'Change image' : 'Upload image';
      rm.hidden = !url;
    };
    input.addEventListener('change', async () => {
      const f = input.files[0];
      if (!f) return;
      thumb.textContent = 'Uploading…';
      try {
        const up = await uploadImage(f, { scope: 'admin', token });
        set(up.url, up.publicId);
      } catch (err) {
        toast(err.message, 'err');
        set(p.dataset.url, p.dataset.pid);
      }
      input.value = '';
    });
    rm.addEventListener('click', () => set('', ''));
  });
}
const pickerValue = (root, name) => {
  const p = $(`[data-picker="${name}"]`, root);
  return p && p.dataset.url ? { url: p.dataset.url, publicId: p.dataset.pid } : null;
};

const inp = (name, label, val = '', extra = '') =>
  `<div class="field"><label for="f_${name}">${label}</label><input id="f_${name}" name="${name}" value="${esc(val)}" ${extra} /></div>`;

/* ---------------- Site content ---------------- */
async function viewContent() {
  const c = await api('/api/content');
  const stats = [...(c.stats || []), {}, {}, {}].slice(0, 3);
  $('#panel').innerHTML = `
  <h2>Site Content</h2>
  <p class="hint">Edit the text and photos shown on your website.</p>
  <form id="contentForm">
    <div class="card">
      <h3>Home</h3>
      ${inp('brandName', 'Brand / name', c.brandName)}
      ${inp('tagline', 'Tagline (small line above the headline)', c.tagline)}
      ${inp('heroTitle', 'Headline', c.heroTitle)}
      <div class="field"><label for="f_heroSubtitle">Intro text</label><textarea id="f_heroSubtitle" name="heroSubtitle" rows="3">${esc(c.heroSubtitle)}</textarea></div>
      ${imagePicker('heroImage', 'Home photo (portrait works best)', c.heroImage, c.heroImagePublicId)}
      <label class="label" style="font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Highlights</label>
      <div class="grid3" style="margin-top:.4rem">
        ${stats.map((s, i) => `<div><input name="statValue${i}" placeholder="e.g. 500+" value="${esc(s.value || '')}" style="margin-bottom:.4rem" /><input name="statLabel${i}" placeholder="e.g. Happy clients" value="${esc(s.label || '')}" /></div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>About</h3>
      ${inp('aboutTitle', 'Heading', c.aboutTitle)}
      <div class="field"><label for="f_aboutText">About text (blank line = new paragraph)</label><textarea id="f_aboutText" name="aboutText" rows="6">${esc(c.aboutText)}</textarea></div>
      ${imagePicker('aboutImage', 'About photo', c.aboutImage, c.aboutImagePublicId)}
    </div>

    <div class="card">
      <h3>Contact & Instagram</h3>
      <div class="grid2">
        ${inp('phone', 'Phone', c.phone, 'type="tel"')}
        ${inp('whatsapp', 'WhatsApp number (with country code, digits only)', c.whatsapp, 'placeholder="919876543210"')}
        ${inp('email', 'Email', c.email, 'type="email"')}
        ${inp('hours', 'Working hours', c.hours)}
      </div>
      ${inp('address', 'Studio address / area', c.address)}
      <div class="grid2">
        ${inp('instagramUrl', 'Instagram page link', c.instagramUrl, 'type="url" placeholder="https://www.instagram.com/yourhandle"')}
        ${inp('instagramHandle', 'Instagram handle (as displayed)', c.instagramHandle, 'placeholder="@yourhandle"')}
      </div>
    </div>

    <div class="card">
      <h3>Reviews</h3>
      <label class="check"><input type="checkbox" name="autoPublishReviews" ${c.autoPublishReviews !== false ? 'checked' : ''} />
        <span>Publish new reviews immediately<small>Turn off to approve each review yourself first (new reviews stay hidden until you publish them).</small></span></label>
    </div>

    <div class="savebar"><button class="btn" type="submit" id="saveContent">Save changes</button></div>
  </form>`;

  const form = $('#contentForm');
  bindImagePickers(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const body = {
      ...Object.fromEntries(['brandName', 'tagline', 'heroTitle', 'heroSubtitle', 'aboutTitle', 'aboutText', 'phone', 'whatsapp', 'email', 'hours', 'address', 'instagramUrl', 'instagramHandle'].map((k) => [k, fd[k]])),
      autoPublishReviews: form.elements.autoPublishReviews.checked,
      stats: [0, 1, 2].map((i) => ({ value: fd[`statValue${i}`], label: fd[`statLabel${i}`] })),
      heroImage: pickerValue(form, 'heroImage'),
      aboutImage: pickerValue(form, 'aboutImage'),
    };
    const btn = $('#saveContent');
    btn.disabled = true;
    try {
      await api('/api/content', { method: 'PUT', body });
      toast('Saved ✓ Your website is updated.');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btn.disabled = false;
    }
  });
}

/* ---------------- Services ---------------- */
async function viewServices() {
  const list = await api('/api/services');
  $('#panel').innerHTML = `
  <h2>Services</h2>
  <p class="hint">The service cards shown on your website.</p>

  <form class="card" id="newService">
    <h3>Add a service</h3>
    ${inp('title', 'Title', '', 'maxlength="80" required')}
    <div class="field"><label>Description</label><textarea name="description" rows="2" maxlength="400"></textarea></div>
    ${imagePicker('image', 'Photo (optional)')}
    <button class="btn" type="submit">Add service</button>
  </form>

  ${list.length ? '' : `<div class="card"><p class="hint" style="margin:0 0 1rem">No services saved yet — your site is showing starter examples.</p><button class="btn btn-ghost" id="seed">Add starter services to edit</button></div>`}

  <div class="list" id="svcList">
    ${list
      .map(
        (s) => `
      <div class="card svc" data-id="${s._id}">
        <div>
          ${inp('title', 'Title', s.title, 'maxlength="80"')}
          <div class="field"><label>Description</label><textarea name="description" rows="3" maxlength="400">${esc(s.description)}</textarea></div>
          <div class="btns"><button class="btn sm" data-save>Save</button><button class="btn danger sm" data-del>Delete</button></div>
        </div>
        ${imagePicker('image', 'Photo', s.image, s.imagePublicId)}
      </div>`
      )
      .join('')}
  </div>`;

  const nf = $('#newService');
  bindImagePickers(nf);
  nf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(nf));
    try {
      await api('/api/services', { method: 'POST', body: { title: fd.title, description: fd.description, image: pickerValue(nf, 'image') } });
      toast('Service added ✓');
      viewServices();
    } catch (err) {
      toast(err.message, 'err');
    }
  });

  $('#seed')?.addEventListener('click', async () => {
    try {
      await api('/api/services', { method: 'POST', body: { seed: true } });
      viewServices();
    } catch (err) {
      toast(err.message, 'err');
    }
  });

  $$('#svcList .svc').forEach((card) => {
    bindImagePickers(card);
    const id = card.dataset.id;
    $('[data-save]', card).onclick = async () => {
      try {
        await api(`/api/services?id=${id}`, {
          method: 'PUT',
          body: { title: $('[name=title]', card).value, description: $('[name=description]', card).value, image: pickerValue(card, 'image') },
        });
        toast('Saved ✓');
      } catch (err) {
        toast(err.message, 'err');
      }
    };
    $('[data-del]', card).onclick = async () => {
      if (!confirm('Delete this service?')) return;
      try {
        await api(`/api/services?id=${id}`, { method: 'DELETE' });
        toast('Service deleted');
        viewServices();
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

/* ---------------- Gallery ---------------- */
async function viewGallery() {
  const items = await api('/api/gallery');
  const cats = [...new Set(items.map((g) => g.category))];
  $('#panel').innerHTML = `
  <h2>Gallery</h2>
  <p class="hint">Upload your work. Categories become filter buttons on the website.</p>

  <div class="card">
    <h3>Upload new images</h3>
    <div class="grid2">
      <div class="field"><label>Category</label><input id="gCat" list="catList" placeholder="e.g. Bridal Makeup" value="${esc(cats[0] || '')}" /><datalist id="catList">${[...new Set(['Bridal Makeup', 'Party Makeup', 'Blouse Designs', 'Embroidery', ...cats])].map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <div class="field"><label>Title (optional)</label><input id="gTitle" placeholder="Shown on hover" /></div>
    </div>
    <label class="drop"><input type="file" id="gFiles" accept="image/*" multiple hidden /><span id="gDropText">＋ Choose one or more photos</span></label>
  </div>

  ${items.length ? `<div class="g-grid" id="gGrid">${items
    .map(
      (g) => `
    <div class="g-card" data-id="${g._id}">
      <img src="${opt(g.url, 400)}" alt="" loading="lazy" />
      <div class="body">
        <input name="title" value="${esc(g.title)}" placeholder="Title" />
        <input name="category" value="${esc(g.category)}" placeholder="Category" list="catList" />
        <div class="row-btns"><button class="btn sm" data-save>Save</button><button class="btn danger sm" data-del>Delete</button></div>
      </div>
    </div>`
    )
    .join('')}</div>` : '<p class="empty">No images yet — upload your first photos above.</p>'}`;

  $('#gFiles').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    const cat = $('#gCat').value.trim() || 'Portfolio';
    const title = $('#gTitle').value.trim();
    let ok = 0;
    for (const [i, f] of files.entries()) {
      $('#gDropText').textContent = `Uploading ${i + 1} of ${files.length}…`;
      try {
        const up = await uploadImage(f, { scope: 'admin', token });
        await api('/api/gallery', { method: 'POST', body: { ...up, category: cat, title: files.length === 1 ? title : '' } });
        ok++;
      } catch (err) {
        toast(`${f.name}: ${err.message}`, 'err');
      }
    }
    if (ok) toast(`${ok} image${ok > 1 ? 's' : ''} added ✓`);
    viewGallery();
  });

  $$('#gGrid .g-card').forEach((card) => {
    const id = card.dataset.id;
    $('[data-save]', card).onclick = async () => {
      try {
        await api(`/api/gallery?id=${id}`, { method: 'PUT', body: { title: $('[name=title]', card).value, category: $('[name=category]', card).value } });
        toast('Saved ✓');
      } catch (err) {
        toast(err.message, 'err');
      }
    };
    $('[data-del]', card).onclick = async () => {
      if (!confirm('Delete this image? It will also be removed from Cloudinary.')) return;
      try {
        await api(`/api/gallery?id=${id}`, { method: 'DELETE' });
        card.remove();
        toast('Image deleted');
      } catch (err) {
        toast(err.message, 'err');
      }
    };
  });
}

/* ---------------- Reviews ---------------- */
let reviewFilter = 'all';
async function viewReviews() {
  const all = await api('/api/reviews?all=1');
  const pub = all.filter((r) => r.status === 'published').length;
  const list = all.filter((r) => reviewFilter === 'all' || r.status === reviewFilter);
  setPill('#pillReviews', all.length - pub);

  $('#panel').innerHTML = `
  <div class="head-row">
    <div><h2>Reviews</h2><p class="hint" style="margin-bottom:0">${all.length} total · ${pub} published · ${all.length - pub} hidden</p></div>
    <div class="seg" id="seg">
      ${[['all', 'All'], ['published', 'Published'], ['hidden', 'Hidden']].map(([v, l]) => `<button data-f="${v}" class="${reviewFilter === v ? 'on' : ''}">${l}</button>`).join('')}
    </div>
  </div>
  ${list.length ? list.map((r) => `
    <article class="review ${r.status === 'hidden' ? 'hiddenr' : ''}" data-id="${r._id}">
      <div>
        <div>${stars(r.rating)} <strong>${esc(r.name)}</strong><span class="tag ${r.status === 'published' ? 'pub' : 'hid'}">${r.status}</span></div>
        <div class="meta">${fmtDate(r.createdAt)}</div>
        <p>${esc(r.content)}</p>
      </div>
      ${r.image?.url ? `<img src="${opt(r.image.url, 300)}" data-big="${esc(r.image.url)}" alt="Review photo" />` : ''}
      <div class="row-btns">
        ${r.status === 'published'
          ? '<button class="btn btn-ghost sm" data-status="hidden">Hide from website</button>'
          : '<button class="btn sm" data-status="published">Publish</button>'}
        <button class="btn danger sm" data-del>Delete</button>
      </div>
    </article>`).join('') : '<p class="empty">No reviews here yet.</p>'}`;

  $('#seg').onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    reviewFilter = b.dataset.f;
    viewReviews();
  };
  $('#panel').onclick = async (e) => {
    const big = e.target.closest('[data-big]');
    if (big) return zoom(big.dataset.big);
    const card = e.target.closest('.review');
    if (!card) return;
    const id = card.dataset.id;
    try {
      const st = e.target.closest('[data-status]');
      if (st) {
        await api(`/api/reviews?id=${id}`, { method: 'PATCH', body: { status: st.dataset.status } });
        toast(st.dataset.status === 'published' ? 'Review published ✓' : 'Review hidden');
        return viewReviews();
      }
      if (e.target.closest('[data-del]')) {
        if (!confirm('Permanently delete this review (and its photo)?')) return;
        await api(`/api/reviews?id=${id}`, { method: 'DELETE' });
        toast('Review deleted');
        viewReviews();
      }
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

function zoom(url) {
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<img src="${opt(url, 1400)}" alt="" />`;
  o.onclick = () => o.remove();
  document.body.appendChild(o);
}

/* ---------------- Messages ---------------- */
async function viewMessages() {
  const list = await api('/api/messages');
  setPill('#pillMessages', list.filter((m) => !m.read).length);
  $('#panel').innerHTML = `
  <h2>Messages</h2>
  <p class="hint">Enquiries sent through the contact form.</p>
  ${list.length ? list.map((m) => `
    <article class="msg ${m.read ? '' : 'unread'}" data-id="${m._id}">
      <h4>${esc(m.name)} ${m.read ? '' : '<span class="tag new">New</span>'}</h4>
      <div class="meta">${fmtDate(m.createdAt)}${m.service ? ` · ${esc(m.service)}` : ''}</div>
      <p>${esc(m.message)}</p>
      <div class="row-btns">
        <a class="btn btn-ghost sm" href="tel:${esc(m.phone.replace(/[^\d+]/g, ''))}">Call ${esc(m.phone)}</a>
        <a class="btn btn-ghost sm" target="_blank" rel="noopener" href="https://wa.me/${esc(m.phone.replace(/\D/g, ''))}">WhatsApp</a>
        <button class="btn btn-ghost sm" data-read="${m.read ? 0 : 1}">${m.read ? 'Mark unread' : 'Mark read'}</button>
        <button class="btn danger sm" data-del>Delete</button>
      </div>
    </article>`).join('') : '<p class="empty">No messages yet.</p>'}`;

  $('#panel').onclick = async (e) => {
    const card = e.target.closest('.msg');
    if (!card) return;
    const id = card.dataset.id;
    try {
      const r = e.target.closest('[data-read]');
      if (r) {
        await api(`/api/messages?id=${id}`, { method: 'PATCH', body: { read: r.dataset.read === '1' } });
        return viewMessages();
      }
      if (e.target.closest('[data-del]')) {
        if (!confirm('Delete this message?')) return;
        await api(`/api/messages?id=${id}`, { method: 'DELETE' });
        viewMessages();
      }
    } catch (err) {
      toast(err.message, 'err');
    }
  };
}

/* ---------------- Start ---------------- */
if (token) {
  showApp(true);
  go('content');
  refreshPills();
}
