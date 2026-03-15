/* =====================================================
   Rayonnance Internal App Hub
   ===================================================== */

const STORAGE_KEY = 'rayonnance_links';

// ── Seed data ──────────────────────────────────────────
const SEED = [
  
];

// ── State ──────────────────────────────────────────────
let links = [];
let activeTag = 'all';
let searchQuery = '';
let pendingDeleteId = null;

// ── Persistence ────────────────────────────────────────
function loadLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        links = parsed;
        return;
      }
    }
  } catch (_) { /* ignore */ }
  links = structuredClone(SEED);
  saveLinks();
}

function saveLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// ── ID generation ──────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Tag helpers ────────────────────────────────────────
function allTags() {
  const set = new Set();
  links.forEach(l => (l.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort();
}

function countForTag(tag) {
  if (tag === 'all') return links.length;
  return links.filter(l => (l.tags || []).includes(tag)).length;
}

// ── Filtering ──────────────────────────────────────────
function filteredLinks() {
  return links.filter(l => {
    const matchesTag = activeTag === 'all' || (l.tags || []).includes(activeTag);
    if (!matchesTag) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      (l.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });
}

// ── Render: Tabs ───────────────────────────────────────
function renderTabs() {
  const bar = document.getElementById('tab-bar');
  const tags = allTags();
  const allCount = filteredLinksForTab('all');

  bar.innerHTML = '';

  const allTab = makeTab('all', 'All', allCount);
  bar.appendChild(allTab);

  tags.forEach(tag => {
    bar.appendChild(makeTab(tag, tag, filteredLinksForTab(tag)));
  });
}

function filteredLinksForTab(tag) {
  if (!searchQuery) return countForTag(tag);
  return links.filter(l => {
    const matchesTag = tag === 'all' || (l.tags || []).includes(tag);
    if (!matchesTag) return false;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      (l.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }).length;
}

function makeTab(tag, label, count) {
  const btn = document.createElement('button');
  btn.className = 'tab' + (tag === activeTag ? ' active' : '');
  btn.dataset.tag = tag;
  btn.innerHTML = `${escHtml(label)}<span class="tab-badge">${count}</span>`;
  btn.addEventListener('click', () => {
    activeTag = tag;
    render();
  });
  return btn;
}

// ── Render: Cards ──────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('card-grid');
  const empty = document.getElementById('empty-state');
  const visible = filteredLinks();

  grid.innerHTML = '';

  if (visible.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  visible.forEach(link => {
    grid.appendChild(makeCard(link));
  });
}

function makeCard(link) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper';

  const a = document.createElement('a');
  a.className = 'card';
  a.href = link.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  const tagPills = (link.tags || [])
    .map(t => `<span class="tag-pill">${escHtml(t)}</span>`)
    .join('');

  a.innerHTML = `
    <div class="card-icon">${escHtml(link.icon || '🔗')}</div>
    <div class="card-name">${escHtml(link.name)}</div>
    ${link.description ? `<div class="card-desc">${escHtml(link.description)}</div>` : ''}
    ${tagPills ? `<div class="card-tags">${tagPills}</div>` : ''}
  `;

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'card-btn edit';
  editBtn.title = 'Edit';
  editBtn.textContent = '✎';
  editBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    openModal(link.id);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'card-btn delete';
  delBtn.title = 'Delete';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    askDelete(link.id, link.name);
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  wrapper.appendChild(a);
  wrapper.appendChild(actions);
  return wrapper;
}

// ── Full render ────────────────────────────────────────
function render() {
  renderTabs();
  renderCards();
}

// ── Modal ──────────────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const errEl = document.getElementById('form-error');

  errEl.style.display = 'none';
  errEl.textContent = '';

  if (id) {
    const link = links.find(l => l.id === id);
    if (!link) return;
    title.textContent = 'Edit Application';
    document.getElementById('field-id').value = link.id;
    document.getElementById('field-icon').value = link.icon || '';
    document.getElementById('field-name').value = link.name;
    document.getElementById('field-url').value = link.url;
    document.getElementById('field-description').value = link.description || '';
    document.getElementById('field-tags').value = (link.tags || []).join(', ');
  } else {
    title.textContent = 'Add Application';
    document.getElementById('link-form').reset();
    document.getElementById('field-id').value = '';
  }

  overlay.style.display = 'flex';
  document.getElementById('field-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// ── Save card (add / edit) ─────────────────────────────
function saveCard(e) {
  e.preventDefault();

  const errEl = document.getElementById('form-error');
  errEl.style.display = 'none';

  const id = document.getElementById('field-id').value;
  const name = document.getElementById('field-name').value.trim();
  const url = document.getElementById('field-url').value.trim();
  const description = document.getElementById('field-description').value.trim();
  const icon = document.getElementById('field-icon').value.trim() || '🔗';
  const tagsRaw = document.getElementById('field-tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

  if (!name) { showFormError('Name is required.'); return; }
  if (!url) { showFormError('URL is required.'); return; }

  try { new URL(url); } catch (_) {
    showFormError('Please enter a valid URL (include https://).');
    return;
  }

  if (id) {
    const idx = links.findIndex(l => l.id === id);
    if (idx !== -1) links[idx] = { id, name, url, description, icon, tags };
  } else {
    links.push({ id: uid(), name, url, description, icon, tags });
  }

  saveLinks();
  closeModal();
  render();
}

function showFormError(msg) {
  const errEl = document.getElementById('form-error');
  errEl.textContent = msg;
  errEl.style.display = 'block';
}

// ── Delete ─────────────────────────────────────────────
function askDelete(id, name) {
  pendingDeleteId = id;
  document.getElementById('confirm-name').textContent = name;
  document.getElementById('confirm-bar').style.display = 'flex';
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  links = links.filter(l => l.id !== pendingDeleteId);
  saveLinks();
  pendingDeleteId = null;
  document.getElementById('confirm-bar').style.display = 'none';
  // If active tag no longer has any links, reset to 'all'
  if (activeTag !== 'all' && !allTags().includes(activeTag)) {
    activeTag = 'all';
  }
  render();
}

function cancelDelete() {
  pendingDeleteId = null;
  document.getElementById('confirm-bar').style.display = 'none';
}

// ── Export ─────────────────────────────────────────────
function exportJSON() {
  const date = new Date().toISOString().slice(0, 10);
  const data = JSON.stringify(links, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rayonnance-links-${date}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Import ─────────────────────────────────────────────
function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) throw new Error('Expected a JSON array.');

      // Validate each entry has at minimum a name and url
      parsed.forEach((item, i) => {
        if (!item.name || !item.url) throw new Error(`Item ${i + 1} is missing name or url.`);
        if (!item.id) item.id = uid();
        if (!item.tags) item.tags = [];
        if (!item.icon) item.icon = '🔗';
      });

      const msg = `Import ${parsed.length} links. Replace existing list?`;
      if (confirm(msg)) {
        links = parsed;
      } else {
        // Merge: add items whose ID doesn't already exist
        const existingIds = new Set(links.map(l => l.id));
        const newItems = parsed.filter(l => !existingIds.has(l.id));
        links = [...links, ...newItems];
      }

      saveLinks();
      activeTag = 'all';
      render();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ── Utilities ──────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init & event wiring ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadLinks();
  render();

  // Header buttons
  document.getElementById('btn-add').addEventListener('click', () => openModal(null));
  document.getElementById('btn-export').addEventListener('click', exportJSON);

  // Import file input
  document.getElementById('import-file').addEventListener('change', e => {
    importJSON(e.target.files[0]);
    e.target.value = ''; // reset so same file can be re-imported
  });

  // Modal
  document.getElementById('link-form').addEventListener('submit', saveCard);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Delete confirmation
  document.getElementById('confirm-yes').addEventListener('click', confirmDelete);
  document.getElementById('confirm-no').addEventListener('click', cancelDelete);

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    render();
  });

  // Keyboard: Escape closes modal / confirm bar
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      cancelDelete();
    }
  });
});
