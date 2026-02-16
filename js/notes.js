// ========================================
// 笔记模块
// ========================================

// ===== 全局状态 =====
var noteExportMode = false;        // 是否处于导出选择模式
var noteExportSelection = [];      // 已选中的笔记ID列表
var noteFilterTag = null;          // 当前筛选的标签
var noteEditPreview = false;       // 编辑页是否处于预览模式
var mdToolbarVisible = false;      // MD工具栏是否可见
var mdPopupEl = null;              // MD工具栏弹出面板元素
var currentNoteTextarea = null;    // 当前正在编辑的textarea

// ========================================
// 笔记列表页
// ========================================

function renderNoteList() {
  var page = document.getElementById('pageNoteList');
  
  // 筛选笔记
  var filtered = appData.notes;
  if (noteFilterTag) {
    filtered = [];
    for (var i = 0; i < appData.notes.length; i++) {
      var note = appData.notes[i];
      if (note.tags && note.tags.indexOf(noteFilterTag) >= 0) {
        filtered.push(note);
      }
    }
  }

  // 渲染顶部操作栏
  var html = '<div class="page-content">';
  html += '<div class="action-bar">';
  if (noteExportMode) {
    html += '<button class="action-btn" id="noteExitExportBtn">✕ 取消</button>';
  } else {
    html += '<button class="action-btn" id="noteExportBtn">导出</button>';
    html += '<button class="action-btn" id="noteFilterBtn">筛选' + 
            (noteFilterTag ? ' · ' + noteFilterTag : '') + '</button>';
  }
  html += '</div>';

  // 渲染笔记列表
  if (filtered.length === 0) {
    html += '<div style="text-align:center; color:var(--text-secondary); padding:40px 0;">暂无笔记</div>';
  }

  for (var i = 0; i < filtered.length; i++) {
    var note = filtered[i];
    var realIndex = appData.notes.indexOf(note);
    var tagStr = buildTagString(note.tags);

    if (noteExportMode) {
      html += renderNoteItemExportMode(note, tagStr);
    } else {
      html += renderNoteItemNormalMode(note, realIndex, tagStr);
    }
  }

  // 新建按钮
  if (!noteExportMode) {
    html += '<div class="add-class-btn" data-action="add-note"><span>⊕</span> 新建笔记</div>';
  }
  html += '</div>';

  page.innerHTML = html;
  bindNoteListEvents();
  hideMdToolbar();
}

// 构建标签字符串
function buildTagString(tags) {
  if (!tags || tags.length === 0) return '';
  var str = '';
  for (var i = 0; i < tags.length; i++) {
    str += '#' + tags[i] + ' ';
  }
  return str;
}

// 渲染导出模式下的笔记项
function renderNoteItemExportMode(note, tagStr) {
  var selIdx = noteExportSelection.indexOf(note.id);
  var html = '<div class="note-item" data-action="toggle-note-export" data-id="' + note.id + '">';
  html += '<div class="note-item-left">';
  html += '<div class="select-circle ' + (selIdx >= 0 ? 'selected' : '') + '">';
  html += (selIdx >= 0 ? (selIdx + 1) : '');
  html += '</div>';
  html += '<div class="note-item-info">';
  html += '<div class="note-item-title">' + escapeHtml(note.title || '未命名笔记') + '</div>';
  html += '<div class="note-item-tags">' + tagStr + '</div>';
  html += '</div></div></div>';
  return html;
}

// 渲染普通模式下的笔记项
function renderNoteItemNormalMode(note, realIndex, tagStr) {
  var html = '<div class="note-item">';
  html += '<div class="note-item-left" data-action="edit-note" data-id="' + note.id + '">';
  html += '<div class="note-item-info">';
  html += '<div class="note-item-title">' + escapeHtml(note.title || '未命名笔记') + '</div>';
  html += '<div class="note-item-tags">' + tagStr + '</div>';
  html += '</div></div>';
  html += '<div class="char-actions">';
  html += '<button class="small-btn" data-action="note-up" data-i="' + realIndex + '">' + ICONS.up + '</button>';
  html += '<button class="small-btn" data-action="note-down" data-i="' + realIndex + '">' + ICONS.down + '</button>';
  html += '<button class="small-btn" data-action="note-more" data-i="' + realIndex + '">' + ICONS.more + '</button>';
  html += '</div></div>';
  return html;
}

// 绑定列表页事件
function bindNoteListEvents() {
  var page = document.getElementById('pageNoteList');
  var actionEls = page.querySelectorAll('[data-action]');
  for (var i = 0; i < actionEls.length; i++) {
    actionEls[i].addEventListener('click', handleNoteAction);
  }

  if (noteExportMode) {
    var exitBtn = document.getElementById('noteExitExportBtn');
    if (exitBtn) {
      exitBtn.addEventListener('click', function() {
        noteExportMode = false;
        noteExportSelection = [];
        document.getElementById('exportBottomBar').classList.remove('visible');
        renderNoteList();
      });
    }
    document.getElementById('exportBottomBar').classList.add('visible');
    updateNoteExportCount();
  } else {
    var expBtn = document.getElementById('noteExportBtn');
    if (expBtn) {
      expBtn.addEventListener('click', function() {
        noteExportMode = true;
        noteExportSelection = [];
        document.getElementById('exportBottomBar').classList.add('visible');
        updateNoteExportCount();
        renderNoteList();
      });
    }
    var filtBtn = document.getElementById('noteFilterBtn');
    if (filtBtn) {
      filtBtn.addEventListener('click', showNoteFilterModal);
    }
  }
}

// 更新导出计数
function updateNoteExportCount() {
  document.getElementById('exportConfirmBtn').textContent = 
    '确认导出 (' + noteExportSelection.length + ')';
}

// 处理笔记列表操作
function handleNoteAction(e) {
  var el = e.target;
  while (el && !el.dataset.action) el = el.parentElement;
  if (!el) return;
  e.stopPropagation();

  var action = el.dataset.action;
  var idx = parseInt(el.dataset.i);

  switch (action) {
    case 'edit-note':
      navigateTo('noteEdit', { noteId: el.dataset.id });
      break;
    case 'note-up':
      moveNoteUp(idx);
      break;
    case 'note-down':
      moveNoteDown(idx);
      break;
    case 'note-more':
      showNoteMoreMenu(idx);
      break;
    case 'add-note':
      addNewNote();
      break;
    case 'toggle-note-export':
      toggleNoteExport(el.dataset.id);
      break;
  }
}

// 上移笔记
function moveNoteUp(idx) {
  if (idx > 0) {
    var tmp = appData.notes[idx - 1];
    appData.notes[idx - 1] = appData.notes[idx];
    appData.notes[idx] = tmp;
    saveData();
    renderNoteList();
  }
}

// 下移笔记
function moveNoteDown(idx) {
  if (idx < appData.notes.length - 1) {
    var tmp = appData.notes[idx];
    appData.notes[idx] = appData.notes[idx + 1];
    appData.notes[idx + 1] = tmp;
    saveData();
    renderNoteList();
  }
}

// 显示笔记更多菜单
function showNoteMoreMenu(idx) {
  var note = appData.notes[idx];
  showModal({
    message: '「' + (note.title || '未命名笔记') + '」',
    buttons: [{ text: '删除', danger: true }, { text: '取消' }]
  }).then(function(r) {
    if (r.index === 0) {
      confirmDeleteNote(idx);
    }
  });
}

// 确认删除笔记
function confirmDeleteNote(idx) {
  showModal({
    message: '确定删除这条笔记吗？',
    buttons: [{ text: '取消' }, { text: '删除', danger: true }]
  }).then(function(r) {
    if (r.index === 1) {
      appData.notes.splice(idx, 1);
      saveData();
      renderNoteList();
      showToast('已删除');
    }
  });
}

// 新建笔记
function addNewNote() {
  var newNote = createNote();
  appData.notes.push(newNote);
  saveData();
  navigateTo('noteEdit', { noteId: newNote.id });
}

// 切换笔记导出选中状态
function toggleNoteExport(id) {
  var idx = noteExportSelection.indexOf(id);
  if (idx >= 0) {
    noteExportSelection.splice(idx, 1);
  } else {
    noteExportSelection.push(id);
  }
  updateNoteExportCount();
  renderNoteList();
}

// ========================================
// 筛选弹窗
// ========================================

function showNoteFilterModal() {
  var tags = getAllTags();
  var overlay = document.getElementById('modalOverlay');
  var body = document.getElementById('modalBody');
  var actions = document.getElementById('modalActions');

  var html = '<div class="filter-modal-content">';
  
  // 角色标签
  html += buildFilterSection('chars', '角色', tags, appData.classes);
  
  // CP标签
  if (tags.cp.length > 0) {
    html += buildFilterSection('cp', 'CP', tags);
  }
  
  // 自定义标签
  if (tags.custom.length > 0) {
    html += buildFilterSection('custom', '其他', tags);
  }
  
  html += '</div>';

  body.innerHTML = html;
  actions.innerHTML = 
    '<button class="modal-btn" id="filterClearBtn">清除筛选</button>' +
    '<button class="modal-btn primary" id="filterCloseBtn">关闭</button>';
  actions.style.display = '';
  overlay.classList.add('active');

  bindFilterEvents(overlay);
}

// 构建筛选区块
function buildFilterSection(key, title, tags, classes) {
  var html = '<div class="filter-section">';
  html += '<div class="filter-section-header" id="fh-' + key + '">';
  html += '<svg class="filter-section-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">';
  html += '<polyline points="6,4 12,10 6,16"/></svg>' + title + '</div>';
  html += '<div class="filter-items" id="fi-' + key + '">';

  if (key === 'chars' && classes) {
    // 按班级分组显示角色
    for (var i = 0; i < classes.length; i++) {
      var cls = classes[i];
      if (cls.characters.length === 0) continue;
      html += '<div style="width:100%; font-size:12px; color:var(--text-secondary); margin-top:4px;">' + 
              escapeHtml(cls.name) + '</div>';
      for (var j = 0; j < cls.characters.length; j++) {
        var ch = cls.characters[j];
        if (!ch.name) continue;
        var sel = noteFilterTag === ch.name ? 'selected' : '';
        html += '<div class="filter-chip ' + sel + '" data-ftag="' + escapeHtml(ch.name) + '">' + 
                escapeHtml(ch.name) + '</div>';
      }
    }
  } else {
    // CP和自定义标签
    var tagList = key === 'cp' ? tags.cp : tags.custom;
    for (var k = 0; k < tagList.length; k++) {
      var sel2 = noteFilterTag === tagList[k] ? 'selected' : '';
      html += '<div class="filter-chip ' + sel2 + '" data-ftag="' + escapeHtml(tagList[k]) + '">' + 
              escapeHtml(tagList[k]) + '</div>';
    }
  }

  html += '</div></div>';
  return html;
}

// 绑定筛选弹窗事件
function bindFilterEvents(overlay) {
  var body = document.getElementById('modalBody');
  
  // 标签点击
  var chips = body.querySelectorAll('[data-ftag]');
  for (var i = 0; i < chips.length; i++) {
    chips[i].addEventListener('click', function() {
      var tag = this.dataset.ftag;
      noteFilterTag = noteFilterTag === tag ? null : tag;
      overlay.classList.remove('active');
      renderNoteList();
    });
  }

  // 折叠/展开
  var sections = ['chars', 'cp', 'custom'];
  for (var j = 0; j < sections.length; j++) {
    bindFilterSectionToggle(sections[j]);
  }

  // 清除/关闭按钮
  document.getElementById('filterClearBtn').addEventListener('click', function() {
    noteFilterTag = null;
    overlay.classList.remove('active');
    renderNoteList();
  });
  document.getElementById('filterCloseBtn').addEventListener('click', function() {
    overlay.classList.remove('active');
  });

  // 点击遮罩关闭
  var overlayHandler = function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      overlay.removeEventListener('click', overlayHandler);
    }
  };
  overlay.addEventListener('click', overlayHandler);
}

// 绑定筛选区块折叠事件
function bindFilterSectionToggle(key) {
  var header = document.getElementById('fh-' + key);
  var items = document.getElementById('fi-' + key);
  if (!header || !items) return;

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

// ========================================
// 笔记编辑页
// ========================================

function renderNoteEdit(data) {
  var note = findNote(data.noteId);
  if (!note) {
    navigateTo('noteList');
    return;
  }

  // 隐藏主导航栏
  var topbar = document.getElementById('topbar');
  var main = document.getElementById('mainContent');
  topbar.style.display = 'none';
  main.style.paddingTop = '0';

  var page = document.getElementById('pageNoteEdit');
  var html = '<div class="note-edit-page">';
  
  // 独立导航栏
  html += '<div class="note-edit-topnav">';
  html += '<button class="btn-icon note-corner" id="noteBackBtn">‹</button>';
  html += '<button class="btn-icon note-corner" id="notePreviewBtn">' + 
          (noteEditPreview ? '✎' : '★') + '</button>';
  html += '</div>';
  
  html += '<div class="note-edit-body">';

  if (noteEditPreview) {
    html += renderNotePreview(note);
  } else {
    html += renderNoteEditor(note);
  }

  html += '</div></div>';
  page.innerHTML = html;

  bindNoteEditEvents(data, note, topbar, main);
}

// 渲染预览模式
function renderNotePreview(note) {
  var html = '<div style="font-size:20px; font-weight:700; padding:8px 0; border-bottom:1px solid var(--border);">' + 
             escapeHtml(note.title || '未命名笔记') + '</div>';
  
  if (note.tags && note.tags.length > 0) {
    html += '<div class="note-tags-clean">';
    for (var i = 0; i < note.tags.length; i++) {
      html += '<span class="note-tag-sm">' + escapeHtml(note.tags[i]) + '</span>';
    }
    html += '</div>';
  }
  
  html += '<div class="note-preview-clean" id="notePreviewContent">' + 
          renderMarkdown(note.content) + '</div>';
  html += '<div style="text-align:center; padding:20px 0 40px;">';
  html += '<button class="action-btn" id="previewSaveImgBtn">保存为图片</button>';
  html += '</div>';
  
  return html;
}

// 渲染编辑模式
function renderNoteEditor(note) {
  var html = '<input class="note-title-clean" id="noteTitleInput" value="' + 
             escapeHtml(note.title) + '">';
  
  html += '<div class="note-tags-clean" id="noteTagsRow">';
  if (note.tags) {
    for (var i = 0; i < note.tags.length; i++) {
      html += '<span class="note-tag-sm">' + escapeHtml(note.tags[i]) + 
              '<span class="note-tag-sm-remove" data-tag-index="' + i + '">✕</span></span>';
    }
  }
  html += '<span class="note-tag-sm-add" id="addNoteTagBtn">+ 添加</span>';
  html += '</div>';
  
  html += '<textarea class="note-content-clean" id="noteContentInput">' + 
          escapeHtml(note.content) + '</textarea>';
  
  return html;
}

// 绑定编辑页事件
function bindNoteEditEvents(data, note, topbar, main) {
  // 返回按钮
  document.getElementById('noteBackBtn').addEventListener('click', function() {
    topbar.style.display = '';
    main.style.paddingTop = '';
    hideMdToolbar();
    navigateTo('noteList');
  });

  // 预览切换
  document.getElementById('notePreviewBtn').addEventListener('click', function() {
    noteEditPreview = !noteEditPreview;
    if (noteEditPreview) hideMdToolbar();
    renderNoteEdit(data);
  });

  if (noteEditPreview) {
    // 预览模式：保存图片
    var saveImgBtn = document.getElementById('previewSaveImgBtn');
    if (saveImgBtn) {
      saveImgBtn.addEventListener('click', function() {
        showToast('正在生成图片...');
        var previewEl = document.getElementById('notePreviewContent');
        var titleText = note.title || '未命名笔记';
        savePreviewAsImage(previewEl, titleText);
      });
    }
  } else {
    // 编辑模式
    bindNoteEditorEvents(note, data);
  }
}

// 绑定编辑器事件
function bindNoteEditorEvents(note, data) {
  // 标题输入
  var titleInput = document.getElementById('noteTitleInput');
  if (titleInput) {
    titleInput.addEventListener('input', function() {
      note.title = this.value;
      triggerAutoSave();
    });
  }

  // 内容输入
  var contentInput = document.getElementById('noteContentInput');
  if (contentInput) {
    currentNoteTextarea = contentInput;
    contentInput.addEventListener('input', function() {
      note.content = this.value;
      triggerAutoSave();
    });
    contentInput.addEventListener('focus', function() {
      showMdToolbar();
    });
  }

  // 标签删除
  var page = document.getElementById('pageNoteEdit');
  var tagRemoves = page.querySelectorAll('.note-tag-sm-remove');
  for (var i = 0; i < tagRemoves.length; i++) {
    tagRemoves[i].addEventListener('click', function() {
      var idx = parseInt(this.dataset.tagIndex);
      note.tags.splice(idx, 1);
      triggerAutoSave();
      renderNoteEdit(data);
    });
  }

  // 添加标签
  var addTagBtn = document.getElementById('addNoteTagBtn');
  if (addTagBtn) {
    addTagBtn.addEventListener('click', function() {
      showTagSelectModal(note, data);
    });
  }

  initMdToolbar();
}

// ========================================
// Markdown 工具栏
// ========================================

function initMdToolbar() {
  var existing = document.getElementById('mdToolbar');
  if (existing) existing.remove();

  var toolbar = document.createElement('div');
  toolbar.id = 'mdToolbar';
  toolbar.className = 'md-toolbar';

  var scroll = document.createElement('div');
  scroll.className = 'md-toolbar-scroll';

  var tools = [
    { label: 'B', action: 'bold' },
    { label: 'I', action: 'italic' },
    { label: 'S', action: 'strike' },
    { label: 'U', action: 'underline' },
    { label: '==', action: 'highlight' },
    { type: 'sep' },
    { label: 'H', action: 'heading' },
    { label: '"', action: 'quote' },
    { label: '•', action: 'ul' },
    { label: '1.', action: 'ol' },
    { type: 'sep' },
    { label: '<>', action: 'code' },
    { label: '🔗', action: 'link' },
    { label: '──', action: 'hr' },
    { type: 'sep' },
    { label: '🎨', action: 'color' },
    { label: '📦', action: 'details' },
    { label: '📊', action: 'table' }
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
      btn.dataset.mdAction = tool.action;
      btn.addEventListener('click', handleMdToolAction);
      scroll.appendChild(btn);
    }
  }

  toolbar.appendChild(scroll);
  document.body.appendChild(toolbar);

  // 初始化弹出面板
  if (!document.getElementById('mdPopup')) {
    var popup = document.createElement('div');
    popup.id = 'mdPopup';
    popup.className = 'md-popup';
    document.body.appendChild(popup);
    mdPopupEl = popup;
  } else {
    mdPopupEl = document.getElementById('mdPopup');
  }

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

// 监听键盘弹起，调整工具栏位置
function setupKeyboardListener() {
  if (!window.visualViewport) return;

  var update = function() {
    var toolbar = document.getElementById('mdToolbar');
    if (!toolbar || !mdToolbarVisible) return;

    var vv = window.visualViewport;
    var offsetTop = vv.offsetTop + vv.height;
    var totalHeight = document.documentElement.clientHeight;
    var bottomOffset = totalHeight - offsetTop;

    if (bottomOffset > 50) {
      toolbar.style.position = 'fixed';
      toolbar.style.bottom = bottomOffset + 'px';
      toolbar.style.paddingBottom = '0';
    } else {
      toolbar.style.position = 'fixed';
      toolbar.style.bottom = '0';
      toolbar.style.paddingBottom = 'env(safe-area-inset-bottom)';
    }
  };

  window.visualViewport.addEventListener('resize', update);
  window.visualViewport.addEventListener('scroll', update);
}

// ========================================
// Markdown 工具栏操作
// ========================================

function handleMdToolAction(e) {
  e.preventDefault();
  var action = this.dataset.mdAction;
  var ta = currentNoteTextarea;
  if (!ta) return;

  closeMdPopup();

  switch (action) {
    case 'bold':
      insertWrap(ta, '**', '**', '粗体文字');
      break;
    case 'italic':
      insertWrap(ta, '*', '*', '斜体文字');
      break;
    case 'strike':
      insertWrap(ta, '~~', '~~', '删除线文字');
      break;
    case 'underline':
      insertWrap(ta, '++', '++', '下划线文字');
      break;
    case 'highlight':
      insertWrap(ta, '==', '==', '高亮文字');
      break;
    case 'quote':
      insertLinePrefix(ta, '> ');
      break;
    case 'ul':
      insertLinePrefix(ta, '- ');
      break;
    case 'ol':
      insertSmartOl(ta);
      break;
    case 'hr':
      insertAtCursor(ta, '\n---\n');
      break;
    case 'link':
      insertLink(ta);
      return;
    case 'code':
      showCodePopup(this);
      return;
    case 'heading':
      showHeadingPopup(this);
      return;
    case 'color':
      showColorPopup(this);
      return;
    case 'details':
      insertAtCursor(ta, '\n>>>标题\n内容\n<<<\n');
      break;
    case 'table':
      showTablePopup(this);
      return;
  }

  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

// 智能有序列表：自动递增编号
function insertSmartOl(ta) {
  var start = ta.selectionStart;
  var textBefore = ta.value.substring(0, start);
  var after = ta.value.substring(start);

  var lastNewline = textBefore.lastIndexOf('\n');
  var currentLine = textBefore.substring(lastNewline + 1);

  // 往上扫描连续编号行
  var num = 0;
  var linesBefore = textBefore.split('\n');
  for (var i = linesBefore.length - 2; i >= 0; i--) {
    var m = linesBefore[i].match(/^(\d+)\.\s/);
    if (m) {
      num = parseInt(m[1]);
      break;
    } else if (linesBefore[i].trim() === '') {
      break;
    }
  }

  // 检查当前行
  var currentMatch = currentLine.match(/^(\d+)\.\s/);
  if (currentMatch) {
    num = parseInt(currentMatch[1]);
  }

  var nextNum = num + 1;
  var prefix = nextNum + '. ';

  if (currentLine.trim() === '') {
    if (textBefore.length === 0 || textBefore.charAt(textBefore.length - 1) === '\n') {
      ta.value = textBefore + prefix + after;
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    } else {
      ta.value = textBefore + '\n' + prefix + after;
      ta.selectionStart = ta.selectionEnd = start + 1 + prefix.length;
    }
  } else {
    ta.value = textBefore + '\n' + prefix + after;
    ta.selectionStart = ta.selectionEnd = start + 1 + prefix.length;
  }
}

// 包裹选中文字
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
  }
  else {
    ta.value = before + prefix + placeholder + suffix + after;
    ta.selectionStart = start + prefix.length;
    ta.selectionEnd = start + prefix.length + placeholder.length;
  }
}

// 插入行前缀
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

// 在光标处插入文本
function insertAtCursor(ta, text) {
  var start = ta.selectionStart;
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(ta.selectionEnd);
  ta.value = before + text + after;
  ta.selectionStart = ta.selectionEnd = start + text.length;
}

// 插入链接
function insertLink(ta) {
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var selected = ta.value.substring(start, end);
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(end);

  if (selected) {
    ta.value = before + '[' + selected + '](url)' + after;
    ta.selectionStart = before.length + selected.length + 3;
    ta.selectionEnd = before.length + selected.length + 6;
  } else {
    ta.value = before + '[链接文字](url)' + after;
    ta.selectionStart = before.length + 1;
    ta.selectionEnd = before.length + 5;
  }
  ta.dispatchEvent(new Event('input'));
  ta.focus();
}

// ========================================
// 工具栏弹出面板
// ========================================

function closeMdPopup() {
  if (mdPopupEl) mdPopupEl.classList.remove('visible');
}

// 弹窗定位：固定在工具栏上方居中
function positionPopup() {
  var popup = mdPopupEl;
  var toolbar = document.getElementById('mdToolbar');
  if (!toolbar || !popup) return;

  var toolbarRect = toolbar.getBoundingClientRect();

  popup.style.visibility = 'hidden';
  popup.style.display = 'block';
  popup.classList.add('visible');

  var popupWidth = popup.offsetWidth;
  var left = (window.innerWidth - popupWidth) / 2;
  if (left < 10) left = 10;

  var bottom = (window.innerHeight - toolbarRect.top) + 8;

  popup.style.left = left + 'px';
  popup.style.right = '';
  popup.style.bottom = bottom + 'px';
  popup.style.top = '';
  popup.style.visibility = '';
  popup.style.display = '';
}

// 标题选择弹窗
function showHeadingPopup() {
  var levels = [
    { l: 1, t: '大标题' },
    { l: 2, t: '中标题' },
    { l: 3, t: '小标题' },
    { l: 4, t: '更小标题' }
  ];
  var html = '';
  for (var i = 0; i < levels.length; i++) {
    html += '<div class="md-popup-item" data-hlevel="' + levels[i].l + '">H' + levels[i].l + '  ' + levels[i].t + '</div>';
  }
  mdPopupEl.innerHTML = html;
  positionPopup();

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

// 代码选择弹窗
function showCodePopup() {
  var html = '';
  html += '<div class="md-popup-item" data-ctype="inline">行内代码 `code`</div>';
  html += '<div class="md-popup-item" data-ctype="block">代码块 ```</div>';
  mdPopupEl.innerHTML = html;
  positionPopup();

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

// 颜色选择弹窗
function showColorPopup() {
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
    html += '<div class="md-color-btn" style="background:' + colors[i].value + 
            '" data-color="' + colors[i].value + '" title="' + colors[i].name + '"></div>';
  }
  html += '</div>';
  mdPopupEl.innerHTML = html;
  positionPopup();

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

// 表格选择弹窗
function showTablePopup() {
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
  positionPopup();

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
    var table = '\n|';
    for (var c2 = 0; c2 < selectedCol; c2++) table += ' 标题 |';
    table += '\n|';
    for (var c3 = 0; c3 < selectedCol; c3++) table += '------|';
    table += '\n';
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

// 点击空白处关闭弹窗
document.addEventListener('click', function(e) {
  if (mdPopupEl && mdPopupEl.classList.contains('visible')) {
    if (!mdPopupEl.contains(e.target) && !e.target.classList.contains('md-tool-btn')) {
      closeMdPopup();
    }
  }
});

// ========================================
// 标签选择弹窗（笔记编辑页用）
// ========================================

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
      html += renderTagSelectCharacters(note);
    } else if (activeTab === 'cp') {
      html += renderTagSelectList(tags.cp, note, '暂无CP标签，请在标签管理中添加');
    } else {
      html += renderTagSelectList(tags.custom, note, '暂无自定义标签，请在标签管理中添加');
    }

    html += '</div>';
    body.innerHTML = html;
    actions.innerHTML = '<button class="modal-btn primary" id="tagSelectDone">完成</button>';
    actions.style.display = '';

    // 绑定事件（闭包内直接处理）
    var tabEls = body.querySelectorAll('[data-stab]');
    for (var i = 0; i < tabEls.length; i++) {
      tabEls[i].addEventListener('click', function() {
        activeTab = this.dataset.stab;
        render();
      });
    }

    var chipEls = body.querySelectorAll('[data-stag]');
    for (var j = 0; j < chipEls.length; j++) {
      chipEls[j].addEventListener('click', function() {
        var tag = this.dataset.stag;
        if (!note.tags) note.tags = [];
        var idx = note.tags.indexOf(tag);
        if (idx >= 0) note.tags.splice(idx, 1);
        else note.tags.push(tag);
        triggerAutoSave();
        render();
      });
    }

    var groupHeaders = body.querySelectorAll('.tag-select-group-header');
    for (var k = 0; k < groupHeaders.length; k++) {
      groupHeaders[k].addEventListener('click', function() {
        var items = this.nextElementSibling;
        var arrow = this.querySelector('.tag-select-group-arrow');
        if (items.style.display === 'none') {
          items.style.display = '';
          if (arrow) arrow.classList.remove('collapsed');
        } else {
          items.style.display = 'none';
          if (arrow) arrow.classList.add('collapsed');
        }
      });
    }

    document.getElementById('tagSelectDone').addEventListener('click', function() {
      overlay.classList.remove('active');
      renderNoteEdit(editData);
    });
  }

  overlay.classList.add('active');
  render();
}

// 渲染角色标签列表
function renderTagSelectCharacters(note) {
  var html = '';
  for (var i = 0; i < appData.classes.length; i++) {
    var cls = appData.classes[i];
    if (cls.characters.length === 0) continue;
    html += '<div class="tag-select-group">';
    html += '<div class="tag-select-group-header">';
    html += '<svg class="tag-select-group-arrow" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">';
    html += '<polyline points="6,4 12,10 6,16"/></svg>' + escapeHtml(cls.name) + '</div>';
    html += '<div class="tag-select-items">';
    for (var j = 0; j < cls.characters.length; j++) {
      var ch = cls.characters[j];
      if (!ch.name) continue;
      var sel = (note.tags && note.tags.indexOf(ch.name) >= 0) ? 'selected' : '';
      html += '<div class="tag-select-chip ' + sel + '" data-stag="' + escapeHtml(ch.name) + '">' + 
              escapeHtml(ch.name) + '</div>';
    }
    html += '</div></div>';
  }
  return html;
}

// 渲染CP/自定义标签列表
function renderTagSelectList(tagList, note, emptyMsg) {
  if (tagList.length === 0) {
    return '<div style="text-align:center; color:var(--text-secondary); padding:20px;">' + emptyMsg + '</div>';
  }
  var html = '<div class="tag-select-items" style="padding:4px 0;">';
  for (var i = 0; i < tagList.length; i++) {
    var sel = (note.tags && note.tags.indexOf(tagList[i]) >= 0) ? 'selected' : '';
    html += '<div class="tag-select-chip ' + sel + '" data-stag="' + escapeHtml(tagList[i]) + '">' + 
            escapeHtml(tagList[i]) + '</div>';
  }
  html += '</div>';
  return html;
}

// ========================================
// 笔记导出
// ========================================

function showNoteExportOptions() {
  if (noteExportSelection.length === 0) {
    showToast('请至少选择一条笔记');
    return;
  }

  // 收集选中的笔记
  var notes = [];
  for (var i = 0; i < noteExportSelection.length; i++) {
    var n = findNote(noteExportSelection[i]);
    if (n) notes.push(n);
  }

  // 拼接文本
  var text = '';
  for (var j = 0; j < notes.length; j++) {
    if (j > 0) text += '\n\n---\n\n';
    if (notes[j].title) text += '# ' + notes[j].title + '\n\n';
    text += notes[j].content || '';
  }

  // 退出导出模式
  noteExportMode = false;
  noteExportSelection = [];
  document.getElementById('exportBottomBar').classList.remove('visible');

  // 渲染导出预览页
  var page = document.getElementById('pageNoteList');
  var html = '<div class="page-content">';
  html += '<div class="preview-topbar">';
  html += '<button class="back-btn" id="noteExportBack">← 返回</button>';
  html += '<div class="note-export-actions">';
  html += '<button class="preview-btn" id="noteExportCopy">复制</button>';
  html += '<button class="preview-btn" id="noteExportTxt">TXT</button>';
  html += '</div></div>';
  html += '<textarea class="preview-textarea" id="noteExportText">' + escapeHtml(text) + '</textarea>';
  html += '</div>';
  page.innerHTML = html;

  bindNoteExportEvents();
}

// 绑定导出页事件
function bindNoteExportEvents() {
  document.getElementById('noteExportBack').addEventListener('click', function() {
    renderNoteList();
  });

  document.getElementById('noteExportCopy').addEventListener('click', function() {
    var text = document.getElementById('noteExportText').value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('已复制');
      });
    } else {
      document.getElementById('noteExportText').select();
      document.execCommand('copy');
      showToast('已复制');
    }
  });

  document.getElementById('noteExportTxt').addEventListener('click', function() {
    var blob = new Blob([document.getElementById('noteExportText').value], {
      type: 'text/plain;charset=utf-8'
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '笔记导出.txt';
    a.click();
    showToast('已下载');
  });
}
