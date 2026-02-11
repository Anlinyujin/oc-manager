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
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(function() { t.classList.remove('visible'); }, 2000);
}

function showSaveIndicator() {
  var el = document.getElementById('saveIndicator');
  if(el) {
    el.classList.add('visible');
    setTimeout(function() { el.classList.remove('visible'); }, 2000);
  }
}

function showModal(opts) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById('modalOverlay');
    var body = document.getElementById('modalBody');
    var actions = document.getElementById('modalActions');
    var h = '';
    if (opts.message) h += '<p>' + opts.message.replace(/\n/g, '<br>') + '</p>';
    if (opts.html) h += opts.html;
    if (opts.input) h += '<input class="modal-input" id="modalInput" value="' + escapeHtml(opts.inputValue||'') + '">';
    
    body.innerHTML = h;
    
    if (opts.buttons) {
      actions.innerHTML = opts.buttons.map(function(b,i) {
        var cls = 'modal-btn ' + (b.danger?'danger':'') + (b.primary?'primary':'');
        return '<button class="' + cls + '" data-i="' + i + '">' + b.text + '</button>';
      }).join('');
      actions.style.display = '';
    } else {
      actions.innerHTML = '';
      actions.style.display = 'none';
    }
    
    overlay.classList.add('active');
    
    if (opts.input) {
      setTimeout(function() {
        var inp = document.getElementById('modalInput');
        if(inp) { inp.focus(); inp.select(); }
      }, 300);
    }
    
    function closeModal(index) {
      overlay.classList.remove('active');
      var val = opts.input ? document.getElementById('modalInput').value : null;
      resolve({ index: index, value: val });
    }
    
    var btns = actions.querySelectorAll('.modal-btn');
    for(var i=0; i<btns.length; i++) {
      btns[i].addEventListener('click', function() {
        closeModal(parseInt(this.dataset.i));
      });
    }
  });
}

// 在光标处插入文本 (MD工具栏核心)
function insertText(textarea, prefix, suffix) {
  var start = textarea.selectionStart;
  var end = textarea.selectionEnd;
  var text = textarea.value;
  var before = text.substring(0, start);
  var after = text.substring(end);
  var selection = text.substring(start, end);
  
  var newText = before + prefix + selection + suffix + after;
  textarea.value = newText;
  
  // 恢复焦点并移动光标
  textarea.focus();
  var newCursorPos = start + prefix.length + selection.length;
  if (selection.length === 0) {
    // 如果没选中文本，光标放在中间
    newCursorPos = start + prefix.length;
  }
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // 触发input事件以保存
  var ev = new Event('input', { bubbles: true });
  textarea.dispatchEvent(ev);
}

function showColorPicker() {
  return new Promise(function(resolve) {
    var colors = [
      {n:'红', c:'red'}, {n:'橙', c:'orange'}, {n:'黄', c:'gold'}, // gold比yellow看清楚
      {n:'绿', c:'green'}, {n:'蓝', c:'blue'}, {n:'紫', c:'purple'}, {n:'灰', c:'gray'}
    ];
    var html = '<div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">';
    colors.forEach(function(c) {
      html += '<div class="color-btn" data-c="'+c.c+'" style="width:36px;height:36px;border-radius:18px;background:'+c.c+';cursor:pointer;border:2px solid #eee;"></div>';
    });
    html += '</div>';
    
    showModal({
      message: '选择文字颜色',
      html: html,
      buttons: [{ text: '取消' }]
    }).then(function(r) {
      resolve(null);
    });
    
    // 绑定颜色点击
    var btns = document.querySelectorAll('.color-btn');
    for(var i=0; i<btns.length; i++) {
      btns[i].addEventListener('click', function() {
        var c = this.dataset.c;
        document.getElementById('modalOverlay').classList.remove('active');
        resolve(c);
      });
    }
  });
}

function showTableCreator() {
  return new Promise(function(resolve) {
    var html = '<div style="display:flex; gap:10px; justify-content:center; align-items:center;">';
    html += '<div>列数 <select id="tblCols" style="padding:4px;"><option>2</option><option>3</option><option>4</option></select></div>';
    html += '<div>行数 <select id="tblRows" style="padding:4px;"><option>2</option><option>3</option><option>4</option></select></div>';
    html += '</div>';
    
    showModal({
      message: '插入表格',
      html: html,
      buttons: [{ text: '取消' }, { text: '插入', primary: true }]
    }).then(function(r) {
      if(r.index === 1) {
        var cols = parseInt(document.getElementById('tblCols').value);
        var rows = parseInt(document.getElementById('tblRows').value);
        resolve({cols: cols, rows: rows});
      } else {
        resolve(null);
      }
    });
  });
}

var ICONS = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18,15 12,9 6,15"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>',
  italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>',
  strike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><path d="M16 6C16 6 14.5 4 12 4C9.5 4 8 6 8 6"></path><path d="M8 18C8 18 9.5 20 12 20C14.5 20 16 18 16 18"></path></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>',
  color: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 12v8"></path><path d="M12 12L4 10"></path><path d="M12 12l8-2"></path></svg>',
  fold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg>'
};
