// ===== UI工具函数 =====

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escapeXml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 2000);
}

function showSaveIndicator() {
  const el = document.getElementById('saveIndicator');
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

function showModal(opts) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    const actions = document.getElementById('modalActions');
    let h = '';
    if (opts.message) h += `<p>${opts.message}</p>`;
    if (opts.html) h += opts.html;
    if (opts.input) h += `<input class="modal-input" id="modalInput" value="${escapeHtml(opts.inputValue||'')}">`;
    body.innerHTML = h;
    if (opts.buttons) {
      actions.innerHTML = opts.buttons.map((b,i) => {
        const cls = ['modal-btn', b.danger?'danger':'', b.primary?'primary':''].filter(Boolean).join(' ');
        return `<button class="${cls}" data-i="${i}">${b.text}</button>`;
      }).join('');
      actions.style.display = '';
    } else {
      actions.innerHTML = '';
      actions.style.display = 'none';
    }
    overlay.classList.add('active');
    if (opts.input) {
      setTimeout(() => {
        const inp = document.getElementById('modalInput');
        if(inp) { inp.focus(); inp.select(); }
      }, 300);
    }
    const closeModal = (index) => {
      overlay.classList.remove('active');
      resolve({ index, value: opts.input ? document.getElementById('modalInput')?.value : null });
    };
    actions.querySelectorAll('.modal-btn').forEach(btn => {
      btn.addEventListener('click', () => closeModal(parseInt(btn.dataset.i)));
    });
    if (opts.dismissible) {
      const handler = (e) => {
        if (e.target === overlay) { closeModal(-1); overlay.removeEventListener('click', handler); }
      };
      overlay.addEventListener('click', handler);
    }
  });
}

const ICONS = {
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="18,15 12,9 6,15"/></svg>`,
  down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6,9 12,15 18,9"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`,
  arrow: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>`
};
