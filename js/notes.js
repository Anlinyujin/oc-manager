// ===== 笔记功能 =====

var noteExportMode = false;
var noteExportSelection = [];
var noteFilterTag = null;
var noteEditPreview = false;
var mdToolbarVisible = false;
var mdPopupEl = null;
var currentNoteTextarea = null;

function renderNoteList() {
  var page = document.getElementById('pageNoteList');
  var filtered = appData.notes;
  if (noteFilterTag) {
    filtered = [];
    for (var f = 0; f < appData.notes.length; f++) {
      var n = appData.notes[f];
      if (n.tags && n.tags.indexOf(noteFilterTag) >= 0) filtered.push(n);
    }
  }

  var h = '<div class="page-content">';
  h += '<div class="action-bar">';
  if (noteExportMode) {
    h += '<button class="action-btn" id="noteExitExportBtn">✕ 取消</button>';
  } else {
    h += '<button class="action-btn" id="noteExportBtn">导出</button>';
    h += '<button class="action-btn" id="noteFilterBtn">筛选' + (noteFilterTag ? ' · ' + noteFilterTag : '') + '</button>';
  }
  h += '</div>';

  if (filtered.length === 0) {
    h += '<div style="text-align:center; color: var(--text-secondary); padding: 40px 0;">暂无笔记</div>';
  }

  for (var i = 0; i < filtered.length; i++) {
    var note = filtered[i];
    var realIndex = appData.notes.indexOf(note);
    var tagStr = '';
    if (note.tags) {
      for (var tt = 0; tt < note.tags.length; tt++) {
        tagStr += '#' + note.tags[tt] + ' ';
      }
    }
    if (noteExportMode) {
      var selIdx = noteExportSelection.indexOf(note.id);
      h += '<div class="note-item" data-action="toggle-note-export" data-id="' + note.id + '">';
      h += '<div class="note-item-left">';
      h += '<div class="select-circle ' + (selIdx >= 0 ? 'selected' : '') + '">' + (selIdx >= 0 ? (selIdx + 1) : '') + '</div>';
      h += '<div class="note-item-info">';
      h += '<div class="note-item-title">' + escapeHtml(note.title || '未命名笔记') + '</div>';
      h += '<div class="note-item-tags">' + tagStr + '</div>';
      h += '</div></div></div>';
    } else {
      h += '<div class="note-item">';
      h += '<div class="note-item-left" data-action="edit-note" data-id="' + note.id + '">';
      h += '<div class="note-item-info">';
      h += '<div class="note-item-title">' + escapeHtml(note.title || '未命名笔记') + '</div>';
      h += '<div class="note-item-tags">' + tagStr + '</div>';
      h += '</div></div>';
      h += '<div class="char-actions">';
      h += '<button class="small-btn" data-action="note-up" data-i="' + realIndex + '">' + ICONS.up + '</button>';
      h += '<button class="small-btn" data-action="note-down" data-i="' + realIndex + '">' + ICONS.down + '</button>';
      h += '<button class="small-btn" data-action="note-more" data-i="' + realIndex + '">' + ICONS.more + '</button>';
      h += '</div></div>';
    }
  }

  if (!noteExportMode) {
    h += '<div class="add-class-btn" data-action="add-note"><span>⊕</span> 新建笔记</div>';
  }
  h += '</div>';
  page.innerHTML = h;

  var actionEls = page.querySelectorAll('[data-action]');
  for (var a = 0; a < actionEls.length; a++) {
    actionEls[a].addEventListener('click', handleNoteAction);
  }

  if (noteExportMode) {
    var exitBtn = document.getElementById('noteExitExportBtn');
    if (exitBtn) exitBtn.addEventListener('click', function() {
      noteExportMode = false;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
      renderNoteList();
    });
    document.getElementById('exportBottomBar').classList.add('visible');
    updateNoteExportCount();
  } else {
    var expBtn = document.getElementById('noteExportBtn');
    if (expBtn) expBtn.addEventListener('click', function() {
      noteExportMode = true;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.add('visible');
      updateNoteExportCount();
      renderNoteList();
    });
    var filtBtn = document.getElementById('noteFilterBtn');
    if (filtBtn) filtBtn.addEventListener('click', showNoteFilterModal);
  }

  // 隐藏工具栏
  hideMdToolbar();
}

function updateNoteExportCount() {
  document.getElementById('exportConfirmBtn').textContent = '确认导出 (' + noteExportSelection.length + ')';
}

function handleNoteAction(e) {
  var el = e.target;
  while (el && !el.dataset.action) el = el.parentElement;
  if (!el) return;
  e.stopPropagation();
  var action = el.dataset.action;
  var idx = parseInt(el.dataset.i);

  if (action === 'edit-note') {
    navigateTo('noteEdit', { noteId: el.dataset.id });
  } else if (action === 'note-up') {
    if (idx > 0) {
      var tmp = appData.notes[idx - 1];
      appData.notes[idx - 1] = appData.notes[idx];
      appData.notes[idx] = tmp;
      saveData(); renderNoteList();
    }
  } else if (action === 'note-down') {
    if (idx < appData.notes.length - 1) {
      var tmp2 = appData.notes[idx];
      appData.notes[idx] = appData.notes[idx + 1];
      appData.notes[idx + 1] = tmp2;
      saveData(); renderNoteList();
    }
  } else if (action === 'note-more') {
    var note = appData.notes[idx];
    showModal({
      message: '「' + (note.title || '未命名笔记') + '」',
      buttons: [{ text: '删除', danger: true }, { text: '取消' }]
    }).then(function(r) {
      if (r.index === 0) {
        showModal({
          message: '确定删除这条笔记吗？',
          buttons: [{ text: '取消' }, { text: '删除', danger: true }]
        }).then(function(r2) {
          if (r2.index === 1) {
            appData.notes.splice(idx, 1);
            saveData(); renderNoteList(); showToast('已删除');
          }
        });
      }
    });
  } else if (action === 'add-note') {
    var newNote = createNote();
    appData.notes.push(newNote);
    saveData();
    navigateTo('noteEdit', { noteId: newNote.id });
  } else if (action === 'toggle-note-export') {
    var id = el.dataset.id;
    var si = noteExportSelection.indexOf(id);
    if (si >= 0) noteExportSelection.splice(si, 1);
    else noteExportSelection.push(id);
    updateNoteExportCount(); renderNoteList();
  }
}

// ===== 筛选弹窗 =====
function showNoteFilterModal() {
  var tags = getAllTags();
  var overlay = document.getElementById('modalOverlay');
  var body = document.getElementById('modalBody');
  var actions = document.getElementById('modalActions');

  var html = '<div class="filter-modal-content">';
  html += '<div class="filter-section">';
  html += '<div class="filter-section-header" id="fh-chars"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>角色</div>';
  html += '<div class="filter-items" id="fi-chars">';
  for (var ci = 0; ci < appData.classes.length; ci++) {
    var cls = appData.classes[ci];
    if (cls.characters.length === 0) continue;
    html += '<div style="width:100%; font-size:12px; color:var(--text-secondary); margin-top:4px;">' + escapeHtml(cls.name) + '</div>';
    for (var chi = 0; chi < cls.characters.length; chi++) {
      var ch = cls.characters[chi];
      if (!ch.name) continue;
      var sel = noteFilterTag === ch.name ? 'selected' : '';
      html += '<div class="filter-chip ' + sel + '" data-ftag="' + escapeHtml(ch.name) + '">' + escapeHtml(ch.name) + '</div>';
    }
  }
  html += '</div></div>';

  if (tags.cp.length > 0) {
    html += '<div class="filter-section">';
    html += '<div class="filter-section-header" id="fh-cp"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>CP</div>';
    html += '<div class="filter-items" id="fi-cp">';
    for (var cpi = 0; cpi < tags.cp.length; cpi++) {
      var sel2 = noteFilterTag === tags.cp[cpi] ? 'selected' : '';
      html += '<div class="filter-chip ' + sel2 + '" data-ftag="' + escapeHtml(tags.cp[cpi]) + '">' + escapeHtml(tags.cp[cpi]) + '</div>';
    }
    html += '</div></div>';
  }

  if (tags.custom.length > 0) {
    html += '<div class="filter-section">';
    html += '<div class="filter-section-header" id="fh-custom"><svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>其他</div>';
    html += '<div class="filter-items" id="fi-custom">';
    for (var cui = 0; cui < tags.custom.length; cui++) {
      var sel3 = noteFilterTag === tags.custom[cui] ? 'selected' : '';
      html += '<div class="filter-chip ' + sel3 + '" data-ftag="' + escapeHtml(tags.custom[cui]) + '">' + escapeHtml(tags.custom[cui]) + '</div>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  body.innerHTML = html;
  actions.innerHTML = '<button class="modal-btn" id="filterClearBtn">清除筛选</button><button class="modal-btn primary" id="filterCloseBtn">关闭</button>';
  actions.style.display = '';
  overlay.classList.add('active');

  var chips = body.querySelectorAll('[data-ftag]');
  for (var fc = 0; fc < chips.length; fc++) {
    chips[fc].addEventListener('click', function() {
      var tag = this.dataset.ftag;
      noteFilterTag = noteFilterTag === tag ? null : tag;
      overlay.classList.remove('active');
      renderNoteList();
    });
  }

  var sections = ['chars', 'cp', 'custom'];
  for (var si2 = 0; si2 < sections.length; si2++) {
    (function(key) {
      var header = document.getElementById('fh-' + key);
      var items = document.getElementById('fi-' + key);
      if (header && items) {
        items.style.maxHeight = (items.scrollHeight + 100) + 'px';
        header.addEventListener('click', function() {
          var arrow = header.querySelector('.filter-section-arrow');
          if (items.classList.contains('collapsed')) {
            items.classList.remove('collapsed');
            items.style.maxHeight = (items.scrollHeight + 100) + 'px';
            if (arrow) arrow.classList.remove('collapsed');
          } else {
            items.classList.add('collapsed');
            items.style.maxHeight = '0';
            if (arrow) arrow.classList.add('collapsed');
          }
        });
      }
    })(sections[si2]);
  }

  document.getElementById('filterClearBtn').addEventListener('click', function() {
    noteFilterTag = null; overlay.classList.remove('active'); renderNoteList();
  });
  document.getElementById('filterCloseBtn').addEventListener('click', function() {
    overlay.classList.remove('active');
  });
  var overlayHandler = function(e) {
    if (e.target === overlay) { overlay.classList.remove('active'); overlay.removeEventListener('click', overlayHandler); }
  };
  overlay.addEventListener('click', overlayHandler);
}

// ===== 笔记编辑页 =====
function renderNoteEdit(data) {
  var note = findNote(data.noteId);
  if (!note) { navigateTo('noteList'); return; }

  var topbar = document.getElementById('topbar');
  var main = document.getElementById('mainContent');
  topbar.style.display = 'none';
  main.style.paddingTop = '0';

  var page = document.getElementById('pageNoteEdit');
  var h = '<div class="note-edit-page">';
  h += '<div class="note-edit-topnav">';
  h += '<button class="btn-icon note-corner" id="noteBackBtn">‹</button>';
  h += '<button class="btn-icon note-corner" id="notePreviewBtn">' + (noteEditPreview ? '✎' : '★') + '</button>';
  h += '</div>';
  h += '<div class="note-edit-body">';

  if (noteEditPreview) {
    h += '<div style="font-size:20px; font-weight:700; padding:8px 0; border-bottom:1px solid var(--border);">' + escapeHtml(note.title || '未命名笔记') + '</div>';
    if (note.tags && note.tags.length > 0) {
      h += '<div class="note-tags-clean">';
      for (var pt = 0; pt < note.tags.length; pt++) {
        h += '<span class="note-tag-sm">' + escapeHtml(note.tags[pt]) + '</span>';
      }
      h += '</div>';
    }
    h += '<div class="note-preview-clean">' + renderMarkdown(note.content) + '</div>';
  } else {
    h += '<input class="note-title-clean" id="noteTitleInput" value="' + escapeHtml(note.title) + '">';
    h += '<div class="note-tags-clean" id="noteTagsRow">';
    if (note.tags) {
      for (var et = 0; et < note.tags.length; et++) {
        h += '<span class="note-tag-sm">' + escapeHtml(note.tags[et]) + '<span class="note-tag-sm-remove" data-tag-index="' + et + '">✕</span></span>';
      }
    }
    h += '<span class="note-tag-sm-add" id="addNoteTagBtn">+ 添加</span>';
    h += '</div>';
    h += '<textarea class="note-content-clean" id="noteContentInput">' + escapeHtml(note.content) + '</textarea>';
  }

  h += '</div></div>';
  page.innerHTML = h;

  document.getElementById('noteBackBtn').addEventListener('click', function() {
    topbar.style.display = '';
    main.style.paddingTop = '';
    hideMdToolbar();
    navigateTo('noteList');
  });

  document.getElementById('notePreviewBtn').addEventListener('click', function() {
    noteEditPreview = !noteEditPreview;
    if (noteEditPreview) hideMdToolbar();
    renderNoteEdit(data);
  });

  if (!noteEditPreview) {
    var titleInput = document.getElementById('noteTitleInput');
    if (titleInput) {
      titleInput.addEventListener('input', function() {
        note.title = this.value; triggerAutoSave();
      });
    }
    var contentInput = document.getElementById('noteContentInput');
    if (contentInput) {
      currentNoteTextarea = contentInput;
      contentInput.addEventListener('input', function() {
        note.content = this.value; triggerAutoSave();
      });
      contentInput.addEventListener('focus', function() {
        showMdToolbar();
      });
    }
    var tagRemoves = page.querySelectorAll('.note-tag-sm-remove');
    for (var tr = 0; tr < tagRemoves.length; tr++) {
      tagRemoves[tr].addEventListener('click', function() {
        var tidx = parseInt(this.dataset.tagIndex);
        note.tags.splice(tidx, 1);
        triggerAutoSave(); renderNoteEdit(data);
      });
    }
    var addTagBtn = document.getElementById('addNoteTagBtn');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', function() {
        showTagSelectModal(note, data);
      });
    }

    // 初始化工具栏
    initMdToolbar();
  } else {
    hideMdToolbar();
    // 绑定代码块复制按钮（已通过onclick内联处理）
  }
}

// ===== MD工具栏 =====
function initMdToolbar() {
  var existing = document.getElementById('mdToolbar');
  if (existing) existing.remove();

  var toolbar = document.createElement('div');
  toolbar.id = 'mdToolbar';
  toolbar.className = 'md-toolbar';

  var scroll = document.createElement('div');
  scroll.className = 'md-toolbar-scroll';

  var tools = [
    { label: 'B', title: '粗体', action: 'bold' },
    { label: 'I', title: '斜体', action: 'italic' },
    { label: 'S', title: '删除线', action: 'strike' },
    { label: 'U', title: '下划线', action: 'underline' },
    { label: '==', title: '高亮', action: 'highlight' },
    { type: 'sep' },
    { label: 'H', title: '标题', action: 'heading' },
    { label: '"', title: '引用', action: 'quote' },
    { label: '•', title: '无序列表', action: 'ul' },
    { label: '1.', title: '有序列表', action: 'ol' },
    { type: 'sep' },
    { label: '<>', title: '代码', action: 'code' },
    { label: '🔗', title: '链接', action: 'link' },
    { label: '──', title: '分割线', action: 'hr' },
    { type: 'sep' },
    { label: '🎨', title: '颜色', action: 'color' },
    { label: '📦', title: '折叠', action: 'details' },
    { label: '📊', title: '表格', action: 'table' }
  ];

  for (var i = 0; i < tools.length; i++) {
    var tool = tools[i];
    if (tool.type === 'sep') {
      var sep = document.createElement('div');
      sep.className = 'md-tool-sep';
      scroll.appendChild(sep);
    } else {
      var btn = document.createElement('button');
      btn.className = 'md-tool-btn';
      btn.textContent = tool.label;
      btn.title = tool.title;
      btn.dataset.mdAction = tool.action;
      btn.addEventListener('click', handleMdToolAction);
      scroll.appendChild(btn);
    }
  }

  toolbar.appendChild(scroll);
  document.body.appendChild(toolbar);

  // 创建弹出面板
  if (!document.getElementById('mdPopup')) {
    var popup = document.createElement('div');
    popup.id = 'mdPopup';
    popup.className = 'md-popup';
    document.body.appendChild(popup);
    mdPopupEl = popup;
  } else {
    mdPopupEl = document.getElementById('mdPopup');
  }

  // 监听键盘弹出
  setupKeyboardListener();
}

function showMdToolbar() {
  var toolbar = document.getElementById('mdToolbar');
  if (toolbar) toolbar.classList.add('visible');
  mdToolbarVisible = true;
}

function hideMdToolbar() {
  var toolbar = document.getElementById('mdToolbar');
  if (toolbar) toolbar.classList.remove('visible');
  if (mdPopupEl) mdPopupEl.classList.remove('visible');
  mdToolbarVisible = false;
}

function setupKeyboardListener() {
  if (window.visualViewport) {
    var toolbar = document.getElementById('mdToolbar');
    var onResize = function() {
      if (!toolbar || !mdToolbarVisible) return;
      var vv = window.visualViewport;
      var keyboardHeight = window.innerHeight - vv.height;
      if (keyboardHeight > 100) {
        // 键盘弹起
        toolbar.style.bottom = keyboardHeight + 'px';
        toolbar.style.paddingBottom = '0';
      } else {
        // 键盘收起
        toolbar.style.bottom = '0';
        toolbar.style.paddingBottom = 'env(safe-area-inset-bottom)';
      }
    };
    window.visualViewport.addEventListener('resize', onResize);
    window.visualViewport.addEventListener('scroll', onResize);
  }
}

function handleMdToolAction(e) {
  e.preventDefault();
  var action = this.dataset.mdAction;
  var ta = currentNoteTextarea;
  if (!ta) return;

  closeMdPopup();

  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var selected = ta.value.substring(start, end);
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(end);

  switch (action) {
    case 'bold':
      insertWrap(ta, '**', '**', '粗体文字'); break;
    case 'italic':
      insertWrap(ta, '*', '*', '斜体文字'); break;
    case 'strike':
      insertWrap(ta, '~~', '~~', '删除线文字'); break;
    case 'underline':
      insertWrap(ta, '++', '++', '下划线文字'); break;
    case 'highlight':
      insertWrap(ta, '==', '==', '高亮文字'); break;
    case 'quote':
      insertLinePrefix(ta, '> '); break;
    case 'ul':
      insertLinePrefix(ta, '- '); break;
    case 'ol':
      insertLinePrefix(ta, '1. '); break;
    case 'hr':
      insertAtCursor(ta, '\n---\n'); break;
    case 'link':
      if (selected) {
        ta.value = before + '[' + selected + '](url)' + after;
        ta.selectionStart = before.length + selected.length + 3;
        ta.selectionEnd = before.length + selected.length + 6;
      } else {
        ta.value = before + '[链接文字](url)' + after;
        ta.selectionStart = before.length + 1;
        ta.selectionEnd = before.length + 5;
      }
      break;
    case 'code':
      showCodePopup(this); return;
    case 'heading':
      showHeadingPopup(this); return;
    case 'color':
      showColorPopup(this); return;
    case 'details':
      insertAtCursor(ta, '\n>>>标题\n内容\n<<<\n'); break;
    case 'table':
      showTablePopup(this); return;
  }

  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

function insertWrap(ta, prefix, suffix, placeholder) {
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var selected = ta.value.substring(start, end);
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(end);

  if (selected) {
    ta.value = before + prefix + selected + suffix + after;
    ta.selectionStart = start + prefix.length;
    ta.selectionEnd = end + prefix.length;
  } else {
    ta.value = before + prefix + placeholder + suffix + after;
    ta.selectionStart = start + prefix.length;
    ta.selectionEnd = start + prefix.length + placeholder.length;
  }
}

function insertLinePrefix(ta, prefix) {
  var start = ta.selectionStart;
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(start);
  var lineStart = before.lastIndexOf('\n') + 1;
  var linePrefix = before.substring(lineStart);

  if (linePrefix === '' && (before.length === 0 || before.charAt(before.length - 1) === '\n')) {
    ta.value = before + prefix + after;
    ta.selectionStart = ta.selectionEnd = start + prefix.length;
  } else {
    ta.value = before + '\n' + prefix + after;
    ta.selectionStart = ta.selectionEnd = start + 1 + prefix.length;
  }
}

function insertAtCursor(ta, text) {
  var start = ta.selectionStart;
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(ta.selectionEnd);
  ta.value = before + text + after;
  ta.selectionStart = ta.selectionEnd = start + text.length;
}

// ===== 弹出面板 =====
function closeMdPopup() {
  if (mdPopupEl) mdPopupEl.classList.remove('visible');
}

function positionPopup(anchorBtn) {
  var rect = anchorBtn.getBoundingClientRect();
  var popup = mdPopupEl;
  popup.style.left = '';
  popup.style.right = '';
  popup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';

  // 确保不超出屏幕
  var left = rect.left;
  if (left + 200 > window.innerWidth) left = window.innerWidth - 210;
  if (left < 10) left = 10;
  popup.style.left = left + 'px';
}

function showHeadingPopup(btn) {
  var html = '';
  var levels = [
    { l: 1, t: '大标题' },
    { l: 2, t: '中标题' },
    { l: 3, t: '小标题' },
    { l: 4, t: '更小标题' }
  ];
  for (var i = 0; i < levels.length; i++) {
    html += '<div class="md-popup-item" data-hlevel="' + levels[i].l + '">H' + levels[i].l + '  ' + levels[i].t + '</div>';
  }
  mdPopupEl.innerHTML = html;
  positionPopup(btn);
  mdPopupEl.classList.add('visible');

  var items = mdPopupEl.querySelectorAll('[data-hlevel]');
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener('click', function() {
      var level = parseInt(this.dataset.hlevel);
      var prefix = '';
      for (var k = 0; k < level; k++) prefix += '#';
      prefix += ' ';
      insertLinePrefix(currentNoteTextarea, prefix);
      currentNoteTextarea.dispatchEvent(new Event('input'));
      currentNoteTextarea.focus();
      closeMdPopup();
    });
  }
}

function showCodePopup(btn) {
  var html = '';
  html += '<div class="md-popup-item" data-ctype="inline">行内代码 `code`</div>';
  html += '<div class="md-popup-item" data-ctype="block">代码块 ```</div>';
  mdPopupEl.innerHTML = html;
  positionPopup(btn);
  mdPopupEl.classList.add('visible');

  var items = mdPopupEl.querySelectorAll('[data-ctype]');
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener('click', function() {
      var type = this.dataset.ctype;
      if (type === 'inline') {
        insertWrap(currentNoteTextarea, '`', '`', '代码');
      } else {
        insertAtCursor(currentNoteTextarea, '\n```\n代码内容\n```\n');
      }
      currentNoteTextarea.dispatchEvent(new Event('input'));
      currentNoteTextarea.focus();
      closeMdPopup();
    });
  }
}

function showColorPopup(btn) {
  var colors = [
    { name: '红', value: 'red' },
    { name: '橙', value: 'orange' },
    { name: '黄', value: 'goldenrod' },
    { name: '绿', value: 'green' },
    { name: '蓝', value: 'blue' },
    { name: '紫', value: 'purple' },
    { name: '粉', value: 'hotpink' },
    { name: '灰', value: 'gray' }
  ];
  var html = '<div class="md-popup-colors">';
  for (var i = 0; i < colors.length; i++) {
    html += '<div class="md-color-btn" style="background:' + colors[i].value + '" data-color="' + colors[i].value + '" title="' + colors[i].name + '"></div>';
  }
  html += '</div>';
  mdPopupEl.innerHTML = html;
  positionPopup(btn);
  mdPopupEl.classList.add('visible');

  var btns = mdPopupEl.querySelectorAll('[data-color]');
  for (var j = 0; j < btns.length; j++) {
    btns[j].addEventListener('click', function() {
      var color = this.dataset.color;
      insertWrap(currentNoteTextarea, '{' + color + '}(', ')', '彩色文字');
      currentNoteTextarea.dispatchEvent(new Event('input'));
      currentNoteTextarea.focus();
      closeMdPopup();
    });
  }
}

function showTablePopup(btn) {
  var html = '<div class="md-popup-table">';
  html += '<div class="md-popup-table-label">列数</div>';
  html += '<div class="md-popup-table-row" id="tableColRow">';
  for (var c = 2; c <= 5; c++) {
    html += '<div class="md-popup-table-num' + (c === 3 ? ' selected' : '') + '" data-col="' + c + '">' + c + '</div>';
  }
  html += '</div>';
  html += '<div class="md-popup-table-label">行数（不含表头）</div>';
  html += '<div class="md-popup-table-row" id="tableRowRow">';
  for (var r = 1; r <= 5; r++) {
    html += '<div class="md-popup-table-num' + (r === 2 ? ' selected' : '') + '" data-row="' + r + '">' + r + '</div>';
  }
  html += '</div>';
  html += '<button class="md-popup-insert" id="tableInsertBtn">插入表格</button>';
  html += '</div>';
  mdPopupEl.innerHTML = html;
  positionPopup(btn);
  mdPopupEl.classList.add('visible');

  var selectedCol = 3, selectedRow = 2;

  var colBtns = mdPopupEl.querySelectorAll('[data-col]');
  for (var i = 0; i < colBtns.length; i++) {
    colBtns[i].addEventListener('click', function() {
      selectedCol = parseInt(this.dataset.col);
      for (var k = 0; k < colBtns.length; k++) colBtns[k].classList.remove('selected');
      this.classList.add('selected');
    });
  }

  var rowBtns = mdPopupEl.querySelectorAll('[data-row]');
  for (var j = 0; j < rowBtns.length; j++) {
    rowBtns[j].addEventListener('click', function() {
      selectedRow = parseInt(this.dataset.row);
      for (var k = 0; k < rowBtns.length; k++) rowBtns[k].classList.remove('selected');
      this.classList.add('selected');
    });
  }

  document.getElementById('tableInsertBtn').addEventListener('click', function() {
    var table = '\n';
    // 表头
    table += '|';
    for (var c2 = 0; c2 < selectedCol; c2++) table += ' 标题 |';
    table += '\n|';
    for (var c3 = 0; c3 < selectedCol; c3++) table += '------|';
    table += '\n';
    // 数据行
    for (var r2 = 0; r2 < selectedRow; r2++) {
      table += '|';
      for (var c4 = 0; c4 < selectedCol; c4++) table += '  |';
      table += '\n';
    }
    insertAtCursor(currentNoteTextarea, table);
    currentNoteTextarea.dispatchEvent(new Event('input'));
    currentNoteTextarea.focus();
    closeMdPopup();
  });
}

// 点击其他地方关闭弹窗
document.addEventListener('click', function(e) {
  if (mdPopupEl && mdPopupEl.classList.contains('visible')) {
    if (!mdPopupEl.contains(e.target) && !e.target.classList.contains('md-tool-btn')) {
      closeMdPopup();
    }
  }
});

function showTagSelectModal(note, editData) {
  var tags = getAllTags();
  var overlay = document.getElementById('modalOverlay');
  var body = document.getElementById('modalBody');
  var actions = document.getElementById('modalActions');
  var activeTab = 'characters';

  function render() {
    var html = '<div class="tag-select-tabs">';
    html += '<div class="tag-select-tab ' + (activeTab === 'characters' ? 'active' : '') + '" data-stab="characters">角色</div>';
    html += '<div class="tag-select-tab ' + (activeTab === 'cp' ? 'active' : '') + '" data-stab="cp">CP</div>';
    html += '<div class="tag-select-tab ' + (activeTab === 'custom' ? 'active' : '') + '" data-stab="custom">其他</div>';
    html += '</div><div class="tag-select-body">';

    if (activeTab === 'characters') {
      for (var ci = 0; ci < appData.classes.length; ci++) {
        var cls = appData.classes[ci];
        if (cls.characters.length === 0) continue;
        html += '<div class="tag-select-group">';
        html += '<div class="tag-select-group-header"><svg class="tag-select-group-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>' + escapeHtml(cls.name) + '</div>';
        html += '<div class="tag-select-items">';
        for (var chi = 0; chi < cls.characters.length; chi++) {
          var ch = cls.characters[chi];
          if (!ch.name) continue;
          var sel = (note.tags && note.tags.indexOf(ch.name) >= 0) ? 'selected' : '';
          html += '<div class="tag-select-chip ' + sel + '" data-stag="' + escapeHtml(ch.name) + '">' + escapeHtml(ch.name) + '</div>';
        }
        html += '</div></div>';
      }
    } else if (activeTab === 'cp') {
      if (tags.cp.length === 0) {
        html += '<div style="text-align:center; color:var(--text-secondary); padding:20px;">暂无CP标签，请在标签管理中添加</div>';
      } else {
        html += '<div class="tag-select-items" style="padding:4px 0;">';
        for (var cpi = 0; cpi < tags.cp.length; cpi++) {
          var sel2 = (note.tags && note.tags.indexOf(tags.cp[cpi]) >= 0) ? 'selected' : '';
          html += '<div class="tag-select-chip ' + sel2 + '" data-stag="' + escapeHtml(tags.cp[cpi]) + '">' + escapeHtml(tags.cp[cpi]) + '</div>';
        }
        html += '</div>';
      }
    } else {
      if (tags.custom.length === 0) {
        html += '<div style="text-align:center; color:var(--text-secondary); padding:20px;">暂无自定义标签，请在标签管理中添加</div>';
      } else {
        html += '<div class="tag-select-items" style="padding:4px 0;">';
        for (var cui = 0; cui < tags.custom.length; cui++) {
          var sel3 = (note.tags && note.tags.indexOf(tags.custom[cui]) >= 0) ? 'selected' : '';
          html += '<div class="tag-select-chip ' + sel3 + '" data-stag="' + escapeHtml(tags.custom[cui]) + '">' + escapeHtml(tags.custom[cui]) + '</div>';
        }
        html += '</div>';
      }
    }
    html += '</div>';
    body.innerHTML = html;
    actions.innerHTML = '<button class="modal-btn primary" id="tagSelectDone">完成</button>';
    actions.style.display = '';

    var tabEls = body.querySelectorAll('[data-stab]');
    for (var ti = 0; ti < tabEls.length; ti++) {
      tabEls[ti].addEventListener('click', function() {
        activeTab = this.dataset.stab; render();
      });
    }
    var chipEls = body.querySelectorAll('[data-stag]');
    for (var ci2 = 0; ci2 < chipEls.length; ci2++) {
      chipEls[ci2].addEventListener('click', function() {
        var tag = this.dataset.stag;
        if (!note.tags) note.tags = [];
        var idx = note.tags.indexOf(tag);
        if (idx >= 0) note.tags.splice(idx, 1);
        else note.tags.push(tag);
        triggerAutoSave(); render();
      });
    }
    var groupHeaders = body.querySelectorAll('.tag-select-group-header');
    for (var gi = 0; gi < groupHeaders.length; gi++) {
      groupHeaders[gi].addEventListener('click', function() {
        var items = this.nextElementSibling;
        var arrow = this.querySelector('.tag-select-group-arrow');
        if (items.style.display === 'none') {
          items.style.display = ''; if (arrow) arrow.classList.remove('collapsed');
        } else {
          items.style.display = 'none'; if (arrow) arrow.classList.add('collapsed');
        }
      });
    }
    document.getElementById('tagSelectDone').addEventListener('click', function() {
      overlay.classList.remove('active'); renderNoteEdit(editData);
    });
  }

  overlay.classList.add('active');
  render();
}

// ===== 笔记导出 =====
function showNoteExportOptions() {
  if (noteExportSelection.length === 0) { showToast('请至少选择一条笔记'); return; }

  var notes = [];
  for (var i = 0; i < noteExportSelection.length; i++) {
    var n = findNote(noteExportSelection[i]);
    if (n) notes.push(n);
  }

  var text = '';
  for (var j = 0; j < notes.length; j++) {
    if (j > 0) text += '\n\n---\n\n';
    if (notes[j].title) text += '# ' + notes[j].title + '\n\n';
    text += notes[j].content || '';
  }

  noteExportMode = false;
  noteExportSelection = [];
  document.getElementById('exportBottomBar').classList.remove('visible');

  var page = document.getElementById('pageNoteList');
  var h = '<div class="page-content">';
  h += '<div class="preview-topbar"><button class="back-btn" id="noteExportBack">← 返回</button>';
  h += '<div class="note-export-actions">';
  h += '<button class="preview-btn" id="noteExportCopy">复制</button>';
  h += '<button class="preview-btn" id="noteExportTxt">TXT</button>';
  h += '<button class="preview-btn" id="noteExportImg">图片</button>';
  h += '</div></div>';
  h += '<textarea class="preview-textarea" id="noteExportText">' + escapeHtml(text) + '</textarea>';
  h += '</div>';
  page.innerHTML = h;

  document.getElementById('noteExportBack').addEventListener('click', function() { renderNoteList(); });
  document.getElementById('noteExportCopy').addEventListener('click', function() {
    var t = document.getElementById('noteExportText').value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).then(function() { showToast('已复制'); });
    } else {
      document.getElementById('noteExportText').select();
      document.execCommand('copy'); showToast('已复制');
    }
  });
  document.getElementById('noteExportTxt').addEventListener('click', function() {
    var blob = new Blob([document.getElementById('noteExportText').value], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '笔记导出.txt';
    a.click(); showToast('已下载');
  });
  document.getElementById('noteExportImg').addEventListener('click', function() {
    showToast('正在生成图片...');
    var rawText = document.getElementById('noteExportText').value;
    var title = notes.length === 1 ? notes[0].title : '';
    exportNoteAsImage(rawText, title).then(function() { showToast('图片已保存'); });
  });
}
