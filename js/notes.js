// ===== 笔记功能 =====

var noteExportMode = false;
var noteExportSelection = [];
var noteFilterTag = null;
var noteEditPreview = false;

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
      saveData();
      renderNoteList();
    }
  } else if (action === 'note-down') {
    if (idx < appData.notes.length - 1) {
      var tmp2 = appData.notes[idx];
      appData.notes[idx] = appData.notes[idx + 1];
      appData.notes[idx + 1] = tmp2;
      saveData();
      renderNoteList();
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
            saveData();
            renderNoteList();
            showToast('已删除');
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
    updateNoteExportCount();
    renderNoteList();
  }
}

// ===== 筛选弹窗 =====
function showNoteFilterModal() {
  var tags = getAllTags();
  var overlay = document.getElementById('modalOverlay');
  var body = document.getElementById('modalBody');
  var actions = document.getElementById('modalActions');

  var html = '<div class="filter-modal-content">';

  // 角色
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

  // CP
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

  // 其他
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

  // 筛选标签点击
  var chips = body.querySelectorAll('[data-ftag]');
  for (var fc = 0; fc < chips.length; fc++) {
    chips[fc].addEventListener('click', function() {
      var tag = this.dataset.ftag;
      noteFilterTag = noteFilterTag === tag ? null : tag;
      overlay.classList.remove('active');
      renderNoteList();
    });
  }

  // 折叠
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
    noteFilterTag = null;
    overlay.classList.remove('active');
    renderNoteList();
  });

  document.getElementById('filterCloseBtn').addEventListener('click', function() {
    overlay.classList.remove('active');
  });

  var overlayHandler = function(e) {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      overlay.removeEventListener('click', overlayHandler);
    }
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
    navigateTo('noteList');
  });

  document.getElementById('notePreviewBtn').addEventListener('click', function() {
    noteEditPreview = !noteEditPreview;
    renderNoteEdit(data);
  });

  if (!noteEditPreview) {
    var titleInput = document.getElementById('noteTitleInput');
    if (titleInput) {
      titleInput.addEventListener('input', function() {
        note.title = this.value;
        triggerAutoSave();
      });
    }
    var contentInput = document.getElementById('noteContentInput');
    if (contentInput) {
      contentInput.addEventListener('input', function() {
        note.content = this.value;
        triggerAutoSave();
      });
    }
    var tagRemoves = page.querySelectorAll('.note-tag-sm-remove');
    for (var tr = 0; tr < tagRemoves.length; tr++) {
      tagRemoves[tr].addEventListener('click', function() {
        var tidx = parseInt(this.dataset.tagIndex);
        note.tags.splice(tidx, 1);
        triggerAutoSave();
        renderNoteEdit(data);
      });
    }
    var addTagBtn = document.getElementById('addNoteTagBtn');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', function() {
        showTagSelectModal(note, data);
      });
    }
  }
}

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
        activeTab = this.dataset.stab;
        render();
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
        triggerAutoSave();
        render();
      });
    }

    var groupHeaders = body.querySelectorAll('.tag-select-group-header');
    for (var gi = 0; gi < groupHeaders.length; gi++) {
      groupHeaders[gi].addEventListener('click', function() {
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

// ===== 笔记导出 =====
function showNoteExportOptions() {
  if (noteExportSelection.length === 0) {
    showToast('请至少选择一条笔记');
    return;
  }

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

  document.getElementById('noteExportBack').addEventListener('click', function() {
    renderNoteList();
  });

  document.getElementById('noteExportCopy').addEventListener('click', function() {
    var t = document.getElementById('noteExportText').value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).then(function() {
        showToast('已复制');
      });
    } else {
      document.getElementById('noteExportText').select();
      document.execCommand('copy');
      showToast('已复制');
    }
  });

  document.getElementById('noteExportTxt').addEventListener('click', function() {
    var blob = new Blob([document.getElementById('noteExportText').value], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '笔记导出.txt';
    a.click();
    showToast('已下载');
  });

  document.getElementById('noteExportImg').addEventListener('click', function() {
    showToast('正在生成图片...');
    var rawText = document.getElementById('noteExportText').value;
    var title = notes.length === 1 ? notes[0].title : '';
    exportNoteAsImage(rawText, title).then(function() {
      showToast('图片已保存');
    });
  });
}
