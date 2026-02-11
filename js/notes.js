// ===== 笔记功能 =====

let noteExportMode = false;
let noteExportSelection = [];
let noteFilterTag = null;
let noteEditPreview = false;

function renderNoteList() {
  const page = document.getElementById('pageNoteList');
  let filtered = appData.notes;
  if (noteFilterTag) {
    filtered = appData.notes.filter(n => n.tags && n.tags.includes(noteFilterTag));
  }

  let h = '<div class="page-content">';

  h += '<div class="action-bar">';
  if (noteExportMode) {
    h += '<button class="action-btn" id="noteExitExportBtn">✕ 取消</button>';
  } else {
    h += '<button class="action-btn" id="noteExportBtn">导出</button>';
    h += '<button class="action-btn" id="noteFilterBtn">筛选' + (noteFilterTag ? ` · ${noteFilterTag}` : '') + '</button>';
  }
  h += '</div>';

  if (filtered.length === 0) {
    h += '<div style="text-align:center; color: var(--text-secondary); padding: 40px 0;">暂无笔记</div>';
  }

  filtered.forEach((note) => {
    const realIndex = appData.notes.indexOf(note);
    if (noteExportMode) {
      const selIdx = noteExportSelection.indexOf(note.id);
      h += `<div class="note-item" data-action="toggle-note-export" data-id="${note.id}">`;
      h += `<div class="note-item-left">`;
      h += `<div class="select-circle ${selIdx>=0?'selected':''}">${selIdx>=0?(selIdx+1):''}</div>`;
      h += `<div class="note-item-info">`;
      h += `<div class="note-item-title">${escapeHtml(note.title||'未命名笔记')}</div>`;
      h += `<div class="note-item-tags">${(note.tags||[]).map(t => '#'+t).join(' ')}</div>`;
      h += `</div></div></div>`;
    } else {
      h += `<div class="note-item">`;
      h += `<div class="note-item-left" data-action="edit-note" data-id="${note.id}">`;
      h += `<div class="note-item-info">`;
      h += `<div class="note-item-title">${escapeHtml(note.title||'未命名笔记')}</div>`;
      h += `<div class="note-item-tags">${(note.tags||[]).map(t => '#'+t).join(' ')}</div>`;
      h += `</div></div>`;
      h += `<div class="char-actions">`;
      h += `<button class="small-btn" data-action="note-up" data-i="${realIndex}">${ICONS.up}</button>`;
      h += `<button class="small-btn" data-action="note-down" data-i="${realIndex}">${ICONS.down}</button>`;
      h += `<button class="small-btn" data-action="note-more" data-i="${realIndex}">${ICONS.more}</button>`;
      h += `</div></div>`;
    }
  });

  if (!noteExportMode) {
    h += '<div class="add-class-btn" data-action="add-note"><span>⊕</span> 新建笔记</div>';
  }

  h += '</div>';
  page.innerHTML = h;

  page.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleNoteAction);
  });

  if (noteExportMode) {
    document.getElementById('noteExitExportBtn')?.addEventListener('click', () => {
      noteExportMode = false;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
      renderNoteList();
    });
    document.getElementById('exportBottomBar').classList.add('visible');
    updateNoteExportCount();
  } else {
    document.getElementById('noteExportBtn')?.addEventListener('click', () => {
      noteExportMode = true;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.add('visible');
      updateNoteExportCount();
      renderNoteList();
    });
    document.getElementById('noteFilterBtn')?.addEventListener('click', showNoteFilterModal);
  }
}

function updateNoteExportCount() {
  document.getElementById('exportConfirmBtn').textContent = `确认导出 (${noteExportSelection.length})`;
}

async function handleNoteAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.stopPropagation();
  const action = el.dataset.action;
  const i = parseInt(el.dataset.i);

  switch(action) {
    case 'edit-note':
      navigateTo('noteEdit', { noteId: el.dataset.id });
      break;
    case 'note-up':
      if (i > 0) { [appData.notes[i-1], appData.notes[i]] = [appData.notes[i], appData.notes[i-1]]; saveData(); renderNoteList(); }
      break;
    case 'note-down':
      if (i < appData.notes.length-1) { [appData.notes[i], appData.notes[i+1]] = [appData.notes[i+1], appData.notes[i]]; saveData(); renderNoteList(); }
      break;
    case 'note-more': {
      const note = appData.notes[i];
      const r = await showModal({ message: `「${note.title||'未命名笔记'}」`, buttons: [{ text: '删除', danger: true }, { text: '取消' }] });
      if (r.index === 0) {
        const r2 = await showModal({ message: `确定删除这条笔记吗？`, buttons: [{ text: '取消' }, { text: '删除', danger: true }] });
        if (r2.index === 1) { appData.notes.splice(i, 1); saveData(); renderNoteList(); showToast('已删除'); }
      }
      break;
    }
    case 'add-note': {
      const note = createNote();
      appData.notes.push(note);
      saveData();
      navigateTo('noteEdit', { noteId: note.id });
      break;
    }
    case 'toggle-note-export': {
      const id = el.dataset.id;
      const idx = noteExportSelection.indexOf(id);
      if (idx >= 0) noteExportSelection.splice(idx, 1);
      else noteExportSelection.push(id);
      updateNoteExportCount();
      renderNoteList();
      break;
    }
  }
}

// ===== 筛选弹窗（修复版） =====
function showNoteFilterModal() {
  const tags = getAllTags();
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  const actions = document.getElementById('modalActions');

  let html = '<div class="filter-modal-content">';

  // 角色（按班级分组）
  html += '<div class="filter-section">';
  html += '<div class="filter-section-header" id="fh-chars"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>角色</div>';
  html += '<div class="filter-items" id="fi-chars">';
  appData.classes.forEach(cls => {
    if (cls.characters.length === 0) return;
    html += `<div style="width:100%; font-size:12px; color:var(--text-secondary); margin-top:4px;">${escapeHtml(cls.name)}</div>`;
    cls.characters.forEach(ch => {
      if (!ch.name) return;
      const sel = noteFilterTag === ch.name ? 'selected' : '';
      html += `<div class="filter-chip ${sel}" data-ftag="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</div>`;
    });
  });
  html += '</div></div>';

  // CP
  if (tags.cp.length > 0) {
    html += '<div class="filter-section">';
    html += '<div class="filter-section-header" id="fh-cp"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>CP</div>';
    html += '<div class="filter-items" id="fi-cp">';
    tags.cp.forEach(t => {
      const sel = noteFilterTag === t ? 'selected' : '';
      html += `<div class="filter-chip ${sel}" data-ftag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
    });
    html += '</div></div>';
  }

  // 其他
  if (tags.custom.length > 0) {
    html += '<div class="filter-section">';
    html += '<div class="filter-section-header" id="fh-custom"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>其他</div>';
    html += '<div class="filter-items" id="fi-custom">';
    tags.custom.forEach(t => {
      const sel = noteFilterTag === t ? 'selected' : '';
      html += `<div class="filter-chip ${sel}" data-ftag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
    });
    html += '</div></div>';
  }

  html += '</div>';

  body.innerHTML = html;
  actions.innerHTML = '<button class="modal-btn" id="filterClearBtn">清除筛选</button><button class="modal-btn primary" id="filterCloseBtn">关闭</button>';
  actions.style.display = '';
  overlay.classList.add('active');

  // 绑定筛选标签点击
  body.querySelectorAll('[data-ftag]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.ftag;
      noteFilterTag = noteFilterTag === tag ? null : tag;
      overlay.classList.remove('active');
      renderNoteList();
    });
  });

  // 折叠按钮
  ['chars', 'cp', 'custom'].forEach(key => {
    const header = document.getElementById(`fh-${key}`);
    const items = document.getElementById(`fi-${key}`);
    if (header && items) {
      items.style.maxHeight = (items.scrollHeight + 100) + 'px';
      header.addEventListener('click', () => {
        const arrow = header.querySelector('.filter-section-arrow');
        if (items.classList.contains('collapsed')) {
          items.classList.remove('collapsed');
          items.style.maxHeight = (items.scrollHeight + 100) + 'px';
          arrow?.classList.remove('collapsed');
        } else {
          items.classList.add('collapsed');
          items.style.maxHeight = '0';
          arrow?.classList.add('collapsed');
        }
      });
    }
  });

  // 清除按钮
  document.getElementById('filterClearBtn').addEventListener('click', () => {
    noteFilterTag = null;
    overlay.classList.remove('active');
    renderNoteList();
  });

  // 关闭按钮
  document.getElementById('filterCloseBtn').addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  // 点遮罩关闭
  const overlayHandler = (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      overlay.removeEventListener('click', overlayHandler);
    }
  };
  overlay.addEventListener('click', overlayHandler);
}

// ===== 笔记编辑页（干净版） =====
function renderNoteEdit(data) {
  const note = findNote(data.noteId);
  if (!note) { navigateTo('noteList'); return; }

  // 隐藏主topbar
  const topbar = document.getElementById('topbar');
  const main = document.getElementById('mainContent');
  topbar.style.display = 'none';
  main.style.paddingTop = '0';

  const page = document.getElementById('pageNoteEdit');

  let h = '<div class="note-edit-page">';

  // 自己的顶部导航
  h += '<div class="note-edit-topnav">';
  h += '<button class="btn-icon note-corner" id="noteBackBtn">‹</button>';
  h += '<button class="btn-icon note-corner" id="notePreviewBtn">' + (noteEditPreview ? '✎' : '★') + '</button>';
  h += '</div>';

  h += '<div class="note-edit-body">';

  if (noteEditPreview) {
    // 预览模式
    h += `<div style="font-size:20px; font-weight:700; padding:8px 0; border-bottom:1px solid var(--border);">${escapeHtml(note.title||'未命名笔记')}</div>`;
    if (note.tags && note.tags.length > 0) {
      h += '<div class="note-tags-clean">';
      note.tags.forEach(tag => { h += `<span class="note-tag-sm">${escapeHtml(tag)}</span>`; });
      h += '</div>';
    }
    h += `<div class="note-preview-clean">${renderMarkdown(note.content)}</div>`;
  } else {
    // 编辑模式
    h += `<input class="note-title-clean" id="noteTitleInput" value="${escapeHtml(note.title)}">`;
    h += '<div class="note-tags-clean" id="noteTagsRow">';
    (note.tags || []).forEach((tag, i) => {
      h += `<span class="note-tag-sm">${escapeHtml(tag)}<span class="note-tag-sm-remove" data-tag-index="${i}">✕</span></span>`;
    });
    h += '<span class="note-tag-sm-add" id="addNoteTagBtn">+ 添加</span>';
    h += '</div>';
    h += `<textarea class="note-content-clean" id="noteContentInput">${escapeHtml(note.content)}</textarea>`;
  }

  h += '</div></div>';
  page.innerHTML = h;

  // 返回按钮
  document.getElementById('noteBackBtn').addEventListener('click', () => {
    // 恢复topbar
    topbar.style.display = '';
    main.style.paddingTop = '';
    navigateTo('noteList');
  });

  // 预览切换
  document.getElementById('notePreviewBtn').addEventListener('click', () => {
    noteEditPreview = !noteEditPreview;
    renderNoteEdit(data);
  });

  if (!noteEditPreview) {
    document.getElementById('noteTitleInput')?.addEventListener('input', e => {
      note.title = e.target.value;
      triggerAutoSave();
    });
    document.getElementById('noteContentInput')?.addEventListener('input', e => {
      note.content = e.target.value;
      triggerAutoSave();
    });
    page.querySelectorAll('.note-tag-sm-remove').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.tagIndex);
        note.tags.splice(idx, 1);
        triggerAutoSave();
        renderNoteEdit(data);
      });
    });
    document.getElementById('addNoteTagBtn')?.addEventListener('click', () => showTagSelectModal(note, data));
  }
}

async function showTagSelectModal(note, editData) {
  const tags = getAllTags();
  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  const actions = document.getElementById('modalActions');
  let activeTab = 'characters';

  function render() {
    let html = '<div class="tag-select-tabs">';
    html += `<div class="tag-select-tab ${activeTab==='characters'?'active':''}" data-stab="characters">角色</div>`;
    html += `<div class="tag-select-tab ${activeTab==='cp'?'active':''}" data-stab="cp">CP</div>`;
    html += `<div class="tag-select-tab ${activeTab==='custom'?'active':''}" data-stab="custom">其他</div>`;
    html += '</div><div class="tag-select-body">';

    if (activeTab === 'characters') {
      appData.classes.forEach(cls => {
        if (cls.characters.length === 0) return;
        html += '<div class="tag-select-group">';
        html += `<div class="tag-select-group-header"><svg class="tag-select-group-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>${escapeHtml(cls.name)}</div>`;
        html += '<div class="tag-select-items">';
        cls.characters.forEach(ch => {
          if (!ch.name) return;
          const sel = (note.tags||[]).includes(ch.name) ? 'selected' : '';
          html += `<div class="tag-select-chip ${sel}" data-stag="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</div>`;
        });
        html += '</div></div>';
      });
    } else if (activeTab === 'cp') {
      if (tags.cp.length === 0) {
        html += '<div style="text-align:center; color:var(--text-secondary); padding:20px;">暂无CP标签，请在标签管理中添加</div>';
      } else {
        html += '<div class="tag-select-items" style="padding:4px 0;">';
        tags.cp.forEach(t => {
          const sel = (note.tags||[]).includes(t) ? 'selected' : '';
          html += `<div class="tag-select-chip ${sel}" data-stag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
        });
        html += '</div>';
      }
    } else {
      if (tags.custom.length === 0) {
        html += '<div style="text-align:center; color:var(--text-secondary); padding:20px;">暂无自定义标签，请在标签管理中添加</div>';
      } else {
        html += '<div class="tag-select-items" style="padding:4px 0;">';
        tags.custom.forEach(t => {
          const sel = (note.tags||[]).includes(t) ? 'selected' : '';
          html += `<div class="tag-select-chip ${sel}" data-stag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
        });
        html += '</div>';
      }
    }

    html += '</div>';
    body.innerHTML = html;
    actions.innerHTML = '<button class="modal-btn primary" id="tagSelectDone">完成</button>';
    actions.style.display = '';

    // Tab切换
    body.querySelectorAll('[data-stab]').forEach(tab => {
      tab.addEventListener('click', () => { activeTab = tab.dataset.stab; render(); });
    });

    // 选择标签
    body.querySelectorAll('[data-stag]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.stag;
        if (!note.tags) note.tags = [];
        const idx = note.tags.indexOf(tag);
        if (idx >= 0) note.tags.splice(idx, 1);
        else note.tags.push(tag);
        triggerAutoSave();
        render();
      });
    });

    // 班级折叠
    body.querySelectorAll('.tag-select-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const items = header.nextElementSibling;
        const arrow = header.querySelector('.tag-select-group-arrow');
        if (items.style.display === 'none') { items.style.display = ''; arrow?.classList.remove('collapsed'); }
        else { items.style.display = 'none'; arrow?.classList.add('collapsed'); }
      });
    });

    // 完成
    document.getElementById('tagSelectDone').addEventListener('click', () => {
      overlay.classList.remove('active');
      renderNoteEdit(editData);
    });
  }

  overlay.classList.add('active');
  render();
}

// ===== 笔记导出 =====
function showNoteExportOptions() {
  if (noteExportSelection.length === 0) { showToast('请至少选择一条笔记'); return; }

  const notes = noteExportSelection.map(id => findNote(id)).filter(Boolean);
  let text = '';
  notes.forEach((note, i) => {
    if (i > 0) text += '\n\n---\n\n';
    if (note.title) text += `# ${note.title}\n\n`;
    text += note.content || '';
  });

  noteExportMode = false;
  noteExportSelection = [];
  document.getElementById('exportBottomBar').classList.remove('visible');

  const page = document.getElementById('pageNoteList');
  let h = '<div class="page-content">';
  h += '<div class="preview-topbar"><button class="back-btn" id="noteExportBack">← 返回</button>';
  h += '<div class="note-export-actions">';
  h += '<button class="preview-btn" id="noteExportCopy">复制</button>';
  h += '<button class="preview-btn" id="noteExportTxt">TXT</button>';
  h += '<button class="preview-btn" id="noteExportImg">图片</button>';
  h += '</div></div>';
  h += `<textarea class="preview-textarea" id="noteExportText">${escapeHtml(text)}</textarea>`;
  h += '</div>';
  page.innerHTML = h;

  document.getElementById('noteExportBack').addEventListener('click', () => renderNoteList());
  document.getElementById('noteExportCopy').addEventListener('click', () => {
    const t = document.getElementById('noteExportText').value;
    navigator.clipboard.writeText(t).then(() => showToast('已复制')).catch(() => {
      document.getElementById('noteExportText').select();
      document.execCommand('copy');
      showToast('已复制');
    });
  });
  document.getElementById('noteExportTxt').addEventListener('click', () => {
    const blob = new Blob([document.getElementById('noteExportText').value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '笔记导出.txt';
    a.click();
    showToast('已下载');
  });
  document.getElementById('noteExportImg').addEventListener('click', async () => {
    showToast('正在生成图片...');
    const rawText = document.getElementById('noteExportText').value;
    const title = notes.length === 1 ? notes[0].title : '';
    await exportNoteAsImage(rawText, title);
    showToast('图片已保存');
  });
}
      h += `<div class="note-item-left">`;
      h += `<div class="select-circle ${selIdx>=0?'selected':''}">${selIdx>=0?(selIdx+1):''}</div>`;
      h += `<div class="note-item-info">`;
      h += `<div class="note-item-title">${escapeHtml(note.title||'未命名笔记')}</div>`;
      h += `<div class="note-item-tags">${(note.tags||[]).map(t => '#'+t).join(' ')}</div>`;
      h += `</div></div></div>`;
    } else {
      h += `<div class="note-item">`;
      h += `<div class="note-item-left" data-action="edit-note" data-id="${note.id}">`;
      h += `<div class="note-item-info">`;
      h += `<div class="note-item-title">${escapeHtml(note.title||'未命名笔记')}</div>`;
      h += `<div class="note-item-tags">${(note.tags||[]).map(t => '#'+t).join(' ')}</div>`;
      h += `</div></div>`;
      h += `<div class="char-actions">`;
      h += `<button class="small-btn" data-action="note-up" data-i="${realIndex}">${ICONS.up}</button>`;
      h += `<button class="small-btn" data-action="note-down" data-i="${realIndex}">${ICONS.down}</button>`;
      h += `<button class="small-btn" data-action="note-more" data-i="${realIndex}">${ICONS.more}</button>`;
      h += `</div></div>`;
    }
  });

  if (!noteExportMode) {
    h += '<div class="add-class-btn" data-action="add-note"><span>⊕</span> 新建笔记</div>';
  }

  h += '</div>';
  page.innerHTML = h;

  // 绑定事件
  page.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleNoteAction);
  });

  if (noteExportMode) {
    document.getElementById('noteExitExportBtn')?.addEventListener('click', () => {
      noteExportMode = false;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
      renderNoteList();
    });
    document.getElementById('exportBottomBar').classList.add('visible');
    updateNoteExportCount();
  } else {
    document.getElementById('noteExportBtn')?.addEventListener('click', () => {
      noteExportMode = true;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.add('visible');
      updateNoteExportCount();
      renderNoteList();
    });
    document.getElementById('noteFilterBtn')?.addEventListener('click', showFilterModal);
  }
}

function updateNoteExportCount() {
  document.getElementById('exportConfirmBtn').textContent = `确认导出 (${noteExportSelection.length})`;
}

async function handleNoteAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.stopPropagation();
  const action = el.dataset.action;
  const i = parseInt(el.dataset.i);

  switch(action) {
    case 'edit-note':
      navigateTo('noteEdit', { noteId: el.dataset.id });
      break;

    case 'note-up':
      if (i > 0) { [appData.notes[i-1], appData.notes[i]] = [appData.notes[i], appData.notes[i-1]]; saveData(); renderNoteList(); }
      break;

    case 'note-down':
      if (i < appData.notes.length-1) { [appData.notes[i], appData.notes[i+1]] = [appData.notes[i+1], appData.notes[i]]; saveData(); renderNoteList(); }
      break;

    case 'note-more': {
      const note = appData.notes[i];
      const r = await showModal({ message: `「${note.title||'未命名笔记'}」`, buttons: [{ text: '删除', danger: true }, { text: '取消' }] });
      if (r.index === 0) {
        const r2 = await showModal({ message: `确定删除这条笔记吗？`, buttons: [{ text: '取消' }, { text: '删除', danger: true }] });
        if (r2.index === 1) { appData.notes.splice(i, 1); saveData(); renderNoteList(); showToast('已删除'); }
      }
      break;
    }

    case 'add-note': {
      const note = createNote();
      appData.notes.push(note);
      saveData();
      navigateTo('noteEdit', { noteId: note.id });
      break;
    }

    case 'toggle-note-export': {
      const id = el.dataset.id;
      const idx = noteExportSelection.indexOf(id);
      if (idx >= 0) noteExportSelection.splice(idx, 1);
      else noteExportSelection.push(id);
      updateNoteExportCount();
      renderNoteList();
      break;
    }
  }
}

// ===== 筛选弹窗 =====
async function showFilterModal() {
  const tags = getAllTags();
  let html = '<div class="filter-modal-content">';

  // 角色（按班级分组）
  html += '<div class="filter-section">';
  html += '<div class="filter-section-header" data-toggle="filter-chars"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>角色</div>';
  html += '<div class="filter-items" id="filter-chars">';
  appData.classes.forEach(cls => {
    if (cls.characters.length === 0) return;
    html += `<div style="width:100%; font-size:12px; color:var(--text-secondary); margin-top:4px;">${escapeHtml(cls.name)}</div>`;
    cls.characters.forEach(ch => {
      if (!ch.name) return;
      const sel = noteFilterTag === ch.name ? 'selected' : '';
      html += `<div class="filter-chip ${sel}" data-tag="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</div>`;
    });
  });
  html += '</div></div>';

  // CP
  if (tags.cp.length > 0) {
    html += '<div class="filter-section">';
    html += '<div class="filter-section-header" data-toggle="filter-cp"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>CP</div>';
    html += '<div class="filter-items" id="filter-cp">';
    tags.cp.forEach(t => {
      const sel = noteFilterTag === t ? 'selected' : '';
      html += `<div class="filter-chip ${sel}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
    });
    html += '</div></div>';
  }

  // 其他
  if (tags.custom.length > 0) {
    html += '<div class="filter-section">';
    html += '<div class="filter-section-header" data-toggle="filter-custom"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>其他</div>';
    html += '<div class="filter-items" id="filter-custom">';
    tags.custom.forEach(t => {
      const sel = noteFilterTag === t ? 'selected' : '';
      html += `<div class="filter-chip ${sel}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
    });
    html += '</div></div>';
  }

  html += '</div>';

  const r = await showModal({
    html: html,
    buttons: [{ text: '清除筛选' }, { text: '关闭', primary: true }],
    dismissible: true
  });

  if (r.index === 0) {
    noteFilterTag = null;
    renderNoteList();
  }

  // 绑定筛选事件（在modal打开时）
  setTimeout(() => {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        noteFilterTag = noteFilterTag === tag ? null : tag;
        document.getElementById('modalOverlay').classList.remove('active');
        renderNoteList();
      });
    });
    document.querySelectorAll('[data-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const id = header.dataset.toggle;
        const items = document.getElementById(id);
        const arrow = header.querySelector('.filter-section-arrow');
        if (items) {
          items.classList.toggle('collapsed');
          if (items.classList.contains('collapsed')) {
            items.style.maxHeight = '0';
            arrow?.classList.add('collapsed');
          } else {
            items.style.maxHeight = (items.scrollHeight + 100) + 'px';
            arrow?.classList.remove('collapsed');
          }
        }
      });
    });
    // 设置初始高度
    document.querySelectorAll('.filter-items:not(.collapsed)').forEach(el => {
      el.style.maxHeight = (el.scrollHeight + 100) + 'px';
    });
  }, 50);
}

// ===== 笔记编辑页 =====
function renderNoteEdit(data) {
  const note = findNote(data.noteId);
  if (!note) { navigateTo('noteList'); return; }

  // 切换topbar样式
  const topbar = document.getElementById('topbar');
  const main = document.getElementById('mainContent');
  topbar.classList.add('note-edit-topbar');
  main.classList.add('note-edit-main');

  // 右上角按钮
  const rightBtn = document.getElementById('topbarRightBtn');
  const rightIcon = document.getElementById('topbarRightIcon');
  rightBtn.classList.remove('hidden');
  rightIcon.textContent = noteEditPreview ? '✎' : '★';
  rightBtn.onclick = () => {
    noteEditPreview = !noteEditPreview;
    renderNoteEdit(data);
  };

  const page = document.getElementById('pageNoteEdit');
  let h = '<div class="note-edit-content">';

  // 标题
  if (noteEditPreview) {
    h += `<div style="font-size:17px; font-weight:600; padding:10px 0; margin-bottom:12px; border-bottom:1px solid var(--border);">${escapeHtml(note.title||'未命名笔记')}</div>`;
  } else {
    h += `<input class="note-title-input" id="noteTitleInput" value="${escapeHtml(note.title)}">`;
  }

  // 标签
  if (!noteEditPreview) {
    h += '<div class="note-tags-section"><div class="note-tags-row" id="noteTagsRow">';
    (note.tags || []).forEach((tag, i) => {
      h += `<span class="note-tag">${escapeHtml(tag)}<span class="note-tag-remove" data-tag-index="${i}">✕</span></span>`;
    });
    h += '<span class="note-tag-add" id="addNoteTagBtn">+ 添加</span>';
    h += '</div></div>';
  } else {
    if (note.tags && note.tags.length > 0) {
      h += '<div class="note-tags-section"><div class="note-tags-row">';
      note.tags.forEach(tag => { h += `<span class="note-tag">${escapeHtml(tag)}</span>`; });
      h += '</div></div>';
    }
  }

  // 内容
  if (noteEditPreview) {
    h += `<div class="note-preview-content">${renderMarkdown(note.content)}</div>`;
  } else {
    h += `<textarea class="note-textarea" id="noteContentInput">${escapeHtml(note.content)}</textarea>`;
  }

  h += '</div>';
  page.innerHTML = h;

  if (!noteEditPreview) {
    // 标题输入
    document.getElementById('noteTitleInput')?.addEventListener('input', e => {
      note.title = e.target.value;
      triggerAutoSave();
    });
    // 内容输入
    document.getElementById('noteContentInput')?.addEventListener('input', e => {
      note.content = e.target.value;
      triggerAutoSave();
    });
    // 删除标签
    page.querySelectorAll('.note-tag-remove').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.tagIndex);
        note.tags.splice(idx, 1);
        triggerAutoSave();
        renderNoteEdit(data);
      });
    });
    // 添加标签
    document.getElementById('addNoteTagBtn')?.addEventListener('click', () => showTagSelectModal(note, data));
  }
}

async function showTagSelectModal(note, editData) {
  const tags = getAllTags();
  const currentTags = note.tags || [];
  let activeTab = 'characters';

  function buildContent(tab) {
    let html = '<div class="tag-select-tabs">';
    html += `<div class="tag-select-tab ${tab==='characters'?'active':''}" data-tab="characters">角色</div>`;
    html += `<div class="tag-select-tab ${tab==='cp'?'active':''}" data-tab="cp">CP</div>`;
    html += `<div class="tag-select-tab ${tab==='custom'?'active':''}" data-tab="custom">其他</div>`;
    html += '</div><div class="tag-select-body">';

    if (tab === 'characters') {
      appData.classes.forEach(cls => {
        if (cls.characters.length === 0) return;
        html += '<div class="tag-select-group">';
        html += `<div class="tag-select-group-header"><svg class="tag-select-group-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>${escapeHtml(cls.name)}</div>`;
        html += '<div class="tag-select-items">';
        cls.characters.forEach(ch => {
          if (!ch.name) return;
          const sel = currentTags.includes(ch.name) ? 'selected' : '';
          html += `<div class="tag-select-chip ${sel}" data-tag="${escapeHtml(ch.name)}">${escapeHtml(ch.name)}</div>`;
        });
        html += '</div></div>';
      });
    } else if (tab === 'cp') {
      if (tags.cp.length === 0) {
        html += '<div style="text-align:center; color:var(--text-secondary); padding:20px;">暂无CP标签，请在标签管理中添加</div>';
      } else {
        html += '<div class="tag-select-items" style="padding:4px 0;">';
        tags.cp.forEach(t => {
          const sel = currentTags.includes(t) ? 'selected' : '';
          html += `<div class="tag-select-chip ${sel}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
        });
        html += '</div>';
      }
    } else {
      if (tags.custom.length === 0) {
        html += '<div style="text-align:center; color:var(--text-secondary); padding:20px;">暂无自定义标签，请在标签管理中添加</div>';
      } else {
        html += '<div class="tag-select-items" style="padding:4px 0;">';
        tags.custom.forEach(t => {
          const sel = currentTags.includes(t) ? 'selected' : '';
          html += `<div class="tag-select-chip ${sel}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
        });
        html += '</div>';
      }
    }

    html += '</div>';
    return html;
  }

  const overlay = document.getElementById('modalOverlay');
  const body = document.getElementById('modalBody');
  const actions = document.getElementById('modalActions');

  function render() {
    body.innerHTML = buildContent(activeTab);
    actions.innerHTML = '<button class="modal-btn primary">完成</button>';
    actions.style.display = '';

    // 标签切换
    body.querySelectorAll('.tag-select-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        render();
      });
    });

    // 选择标签
    body.querySelectorAll('.tag-select-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const idx = note.tags.indexOf(tag);
        if (idx >= 0) note.tags.splice(idx, 1);
        else note.tags.push(tag);
        triggerAutoSave();
        render();
      });
    });

    // 班级折叠
    body.querySelectorAll('.tag-select-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const items = header.nextElementSibling;
        const arrow = header.querySelector('.tag-select-group-arrow');
        if (items.style.display === 'none') {
          items.style.display = '';
          arrow?.classList.remove('collapsed');
        } else {
          items.style.display = 'none';
          arrow?.classList.add('collapsed');
        }
      });
    });

    // 完成按钮
    actions.querySelector('.modal-btn').addEventListener('click', () => {
      overlay.classList.remove('active');
      renderNoteEdit(editData);
    });
  }

  overlay.classList.add('active');
  render();
}

// ===== 笔记导出 =====
function showNoteExportOptions() {
  if (noteExportSelection.length === 0) { showToast('请至少选择一条笔记'); return; }

  const notes = noteExportSelection.map(id => findNote(id)).filter(Boolean);
  let text = '';
  notes.forEach((note, i) => {
    if (i > 0) text += '\n\n---\n\n';
    if (note.title) text += `# ${note.title}\n\n`;
    text += note.content || '';
  });

  const rendered = notes.map(n => {
    let h = '';
    if (n.title) h += `<h1>${escapeHtml(n.title)}</h1>`;
    h += renderMarkdown(n.content);
    return h;
  }).join('<hr>');

  noteExportMode = false;
  noteExportSelection = [];
  document.getElementById('exportBottomBar').classList.remove('visible');

  // 显示导出选项页
  const page = document.getElementById('pageNoteList');
  let h = '<div class="page-content">';
  h += '<div class="preview-topbar"><button class="back-btn" id="noteExportBack">← 返回</button>';
  h += '<div class="note-export-actions">';
  h += '<button class="preview-btn" id="noteExportCopy">复制</button>';
  h += '<button class="preview-btn" id="noteExportTxt">TXT</button>';
  h += '<button class="preview-btn" id="noteExportImg">图片</button>';
  h += '</div></div>';
  h += `<textarea class="preview-textarea" id="noteExportText">${escapeHtml(text)}</textarea>`;
  h += '</div>';
  page.innerHTML = h;

  document.getElementById('noteExportBack').addEventListener('click', () => renderNoteList());
  document.getElementById('noteExportCopy').addEventListener('click', () => {
    const t = document.getElementById('noteExportText').value;
    navigator.clipboard.writeText(t).then(() => showToast('已复制')).catch(() => {
      document.getElementById('noteExportText').select();
      document.execCommand('copy');
      showToast('已复制');
    });
  });
  document.getElementById('noteExportTxt').addEventListener('click', () => {
    const blob = new Blob([document.getElementById('noteExportText').value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '笔记导出.txt';
    a.click();
    showToast('已下载');
  });
  document.getElementById('noteExportImg').addEventListener('click', async () => {
    showToast('正在生成图片...');
    const title = notes.length === 1 ? notes[0].title : '';
    await exportNoteAsImage(rendered, title);
    showToast('图片已保存');
  });
}
