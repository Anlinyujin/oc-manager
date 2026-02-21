// ===== 信息表模块 =====

// ===== 列表页 =====
function renderInfoList() {
  var page = document.getElementById('pageInfoList');
  var sheets = appData.infoSheets || [];
  var h = '<div class="page-content">';

  h += '<div class="action-bar">';
  h += '<div class="action-btn" id="infoAddBtn">+ 新建信息表</div>';
  h += '</div>';

  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    h += '<div class="note-item" data-id="' + s.id + '">';
    h += '<div class="note-item-left info-item-left" data-id="' + s.id + '">';
    h += '<div class="note-item-info">';
    h += '<div class="note-item-title">' + escapeHtml(s.title || '未命名信息表') + '</div>';
    h += '</div></div>';
    h += '<div class="char-actions">';
    h += '<button class="small-btn info-move-btn" data-id="' + s.id + '" data-dir="up">' + ICONS.up + '</button>';
    h += '<button class="small-btn info-move-btn" data-id="' + s.id + '" data-dir="down">' + ICONS.down + '</button>';
    h += '<button class="small-btn info-more-btn" data-id="' + s.id + '">' + ICONS.more + '</button>';
    h += '</div></div>';
  }

  h += '</div>';
  page.innerHTML = h;

  document.getElementById('infoAddBtn').addEventListener('click', function() {
    var sheet = createInfoSheet();
    appData.infoSheets.push(sheet);
    saveData();
    navigateTo('infoEdit', sheet.id);
  });

  page.querySelectorAll('.info-item-left').forEach(function(el) {
    el.addEventListener('click', function() {
      navigateTo('infoEdit', this.getAttribute('data-id'));
    });
  });

  page.querySelectorAll('.info-move-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.getAttribute('data-id');
      var dir = this.getAttribute('data-dir');
      var arr = appData.infoSheets;
      var idx = -1;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) { idx = i; break; }
      }
      if (idx < 0) return;
      if (dir === 'up' && idx > 0) {
        var tmp = arr[idx]; arr[idx] = arr[idx - 1]; arr[idx - 1] = tmp;
      } else if (dir === 'down' && idx < arr.length - 1) {
        var tmp = arr[idx]; arr[idx] = arr[idx + 1]; arr[idx + 1] = tmp;
      }
      saveData();
      renderInfoList();
    });
  });

  page.querySelectorAll('.info-more-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = this.getAttribute('data-id');
      var sheet = findInfoSheet(id);
      var name = (sheet && sheet.title) ? sheet.title : '未命名信息表';
      showModal({
        message: '「' + name + '」',
        buttons: [
          { text: '删除', danger: true },
          { text: '取消' }
        ]
      }).then(function(r) {
        if (r.index !== 0) return;
        showModal({
          message: '确定删除「' + name + '」吗？',
          buttons: [{ text: '取消' }, { text: '删除', danger: true }]
        }).then(function(r2) {
          if (r2.index !== 1) return;
          for (var i = 0; i < appData.infoSheets.length; i++) {
            if (appData.infoSheets[i].id === id) {
              appData.infoSheets.splice(i, 1); break;
            }
          }
          saveData();
          renderInfoList();
        });
      });
    });
  });
}

// ===== 编辑页 =====
function renderInfoEdit(sheetId) {
  var page = document.getElementById('pageInfoEdit');
  var sheet = findInfoSheet(sheetId);
  if (!sheet) { navigateTo('infoList'); return; }

  // 收集所有角色（带班级信息）
  var allChars = [];
  for (var i = 0; i < appData.classes.length; i++) {
    var cls = appData.classes[i];
    for (var j = 0; j < cls.characters.length; j++) {
      allChars.push({ id: cls.characters[j].id, name: cls.characters[j].name || '未命名', className: cls.name });
    }
  }

  // 分组角色和未分组角色
  var groupedCharIds = [];
  for (var g = 0; g < sheet.groups.length; g++) {
    var grp = sheet.groups[g];
    for (var k = 0; k < grp.charIds.length; k++) {
      groupedCharIds.push(grp.charIds[k]);
    }
  }

  var ungroupedChars = [];
  for (var i = 0; i < allChars.length; i++) {
    if (groupedCharIds.indexOf(allChars[i].id) < 0) {
      ungroupedChars.push(allChars[i]);
    }
  }

  var h = '<div class="note-edit-page">';

  // 独立导航栏
  h += '<div class="note-edit-topnav">';
  h += '<button class="btn-icon note-corner" id="infoEditBackBtn">‹</button>';
  h += '<div style="display:flex;gap:4px;">';
  h += '<button class="btn-icon note-corner" id="infoGroupBtn" title="分组管理">⊞</button>';
  h += '<button class="btn-icon note-corner" id="infoExportBtn" title="导出预览">↗</button>';
  h += '</div>';
  h += '</div>';

  // 标题
  h += '<div class="note-edit-body info-edit-body">';
  h += '<input class="note-title-clean" id="infoTitleInput" value="' + escapeHtml(sheet.title) + '">';

  // 按分组渲染
  for (var g = 0; g < sheet.groups.length; g++) {
    var grp = sheet.groups[g];
    h += '<div class="info-group-section">';
    h += '<div class="info-group-title">' + escapeHtml(grp.name) + '</div>';
    for (var k = 0; k < grp.charIds.length; k++) {
      var charId = grp.charIds[k];
      var charInfo = findCharInfoById(allChars, charId);
      if (!charInfo) continue;
      var val = (sheet.values && sheet.values[charId]) || '';
      h += '<div class="info-char-row">';
      h += '<span class="info-char-name">' + escapeHtml(charInfo.name) + '</span>';
      h += '<input class="info-char-input" data-charid="' + charId + '" value="' + escapeHtml(val) + '">';
      h += '</div>';
    }
    h += '</div>';
  }

  // 未分组角色
  if (ungroupedChars.length > 0) {
    if (sheet.groups.length > 0) {
      h += '<div class="info-group-section">';
      h += '<div class="info-group-title info-group-ungrouped">未分组</div>';
    } else {
      h += '<div class="info-group-section">';
    }
    for (var i = 0; i < ungroupedChars.length; i++) {
      var ch = ungroupedChars[i];
      var val = (sheet.values && sheet.values[ch.id]) || '';
      h += '<div class="info-char-row">';
      h += '<span class="info-char-name">' + escapeHtml(ch.name) + '</span>';
      h += '<input class="info-char-input" data-charid="' + ch.id + '" value="' + escapeHtml(val) + '">';
      h += '</div>';
    }
    h += '</div>';
  }

  h += '</div></div>';
  page.innerHTML = h;

  // 事件绑定
  document.getElementById('infoEditBackBtn').addEventListener('click', function() {
    navigateTo('infoList');
  });

  document.getElementById('infoTitleInput').addEventListener('input', function() {
    sheet.title = this.value;
    triggerAutoSave();
  });

  page.querySelectorAll('.info-char-input').forEach(function(input) {
    input.addEventListener('input', function() {
      if (!sheet.values) sheet.values = {};
      sheet.values[this.getAttribute('data-charid')] = this.value;
      triggerAutoSave();
    });
  });

  document.getElementById('infoGroupBtn').addEventListener('click', function() {
    showInfoGroupModal(sheet, allChars);
  });

  document.getElementById('infoExportBtn').addEventListener('click', function() {
    var text = generateInfoExportText(sheet, allChars);
    navigateTo('infoPreview', text);
  });
}

function findCharInfoById(allChars, id) {
  for (var i = 0; i < allChars.length; i++) {
    if (allChars[i].id === id) return allChars[i];
  }
  return null;
}

// ===== 分组管理弹窗 =====
function showInfoGroupModal(sheet, allChars) {
  var overlay = document.getElementById('modalOverlay');
  var body = document.getElementById('modalBody');
  var actions = document.getElementById('modalActions');

  var h = '<div style="text-align:left;max-height:60vh;overflow-y:auto;">';

  // 新建分组
  h += '<div style="display:flex;gap:8px;margin-bottom:16px;">';
  h += '<input class="modal-input" id="infoNewGroupInput" style="flex:1;text-align:left;margin:0;">';
  h += '<button class="preview-btn" id="infoNewGroupBtn" style="flex-shrink:0;">新建分组</button>';
  h += '</div>';

  // 各分组
  for (var g = 0; g < sheet.groups.length; g++) {
    var grp = sheet.groups[g];
    h += '<div class="info-modal-group" data-gidx="' + g + '">';
    h += '<div class="info-modal-group-header">';
    h += '<span class="info-modal-group-name">' + escapeHtml(grp.name) + '</span>';
    h += '<div style="display:flex;gap:2px;">';
    h += '<button class="small-btn info-grp-move" data-gidx="' + g + '" data-dir="up">' + ICONS.up + '</button>';
    h += '<button class="small-btn info-grp-move" data-gidx="' + g + '" data-dir="down">' + ICONS.down + '</button>';
    h += '<button class="small-btn info-grp-del" data-gidx="' + g + '">✕</button>';
    h += '</div></div>';

    // 分组内角色
    for (var k = 0; k < grp.charIds.length; k++) {
      var charInfo = findCharInfoById(allChars, grp.charIds[k]);
      if (!charInfo) continue;
      h += '<div class="info-modal-char">';
      h += '<span>' + escapeHtml(charInfo.name) + '</span>';
      h += '<div style="display:flex;gap:2px;">';
      h += '<button class="small-btn info-char-move" data-gidx="' + g + '" data-cidx="' + k + '" data-dir="up">' + ICONS.up + '</button>';
      h += '<button class="small-btn info-char-move" data-gidx="' + g + '" data-cidx="' + k + '" data-dir="down">' + ICONS.down + '</button>';
      h += '<button class="small-btn info-char-remove" data-gidx="' + g + '" data-cidx="' + k + '">✕</button>';
      h += '</div></div>';
    }

    // 添加角色到此分组
    h += '<button class="info-modal-add-char" data-gidx="' + g + '">+ 添加角色</button>';
    h += '</div>';
  }

  // 未分组角色列表
  var groupedIds = [];
  for (var g = 0; g < sheet.groups.length; g++) {
    for (var k = 0; k < sheet.groups[g].charIds.length; k++) {
      groupedIds.push(sheet.groups[g].charIds[k]);
    }
  }
  var ungrouped = [];
  for (var i = 0; i < allChars.length; i++) {
    if (groupedIds.indexOf(allChars[i].id) < 0) ungrouped.push(allChars[i]);
  }
  if (ungrouped.length > 0) {
    h += '<div class="info-modal-ungrouped">';
    h += '<div class="info-modal-group-header"><span style="color:#888;">未分组角色</span></div>';
    for (var i = 0; i < ungrouped.length; i++) {
      h += '<div class="info-modal-char"><span>' + escapeHtml(ungrouped[i].name) + '</span></div>';
    }
    h += '</div>';
  }

  h += '</div>';

  body.innerHTML = h;
  actions.innerHTML = '<button class="modal-btn primary" id="infoGroupDoneBtn">完成</button>';
  overlay.classList.add('active');

  // 新建分组
  document.getElementById('infoNewGroupBtn').addEventListener('click', function() {
    var input = document.getElementById('infoNewGroupInput');
    var name = input.value.trim();
    if (!name) return;
    sheet.groups.push({ name: name, charIds: [] });
    saveData();
    showInfoGroupModal(sheet, allChars);
  });

  // 分组上移下移
  body.querySelectorAll('.info-grp-move').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var gidx = parseInt(this.getAttribute('data-gidx'));
      var dir = this.getAttribute('data-dir');
      var arr = sheet.groups;
      if (dir === 'up' && gidx > 0) {
        var tmp = arr[gidx]; arr[gidx] = arr[gidx - 1]; arr[gidx - 1] = tmp;
      } else if (dir === 'down' && gidx < arr.length - 1) {
        var tmp = arr[gidx]; arr[gidx] = arr[gidx + 1]; arr[gidx + 1] = tmp;
      }
      saveData();
      showInfoGroupModal(sheet, allChars);
    });
  });

  // 删除分组
  body.querySelectorAll('.info-grp-del').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var gidx = parseInt(this.getAttribute('data-gidx'));
      sheet.groups.splice(gidx, 1);
      saveData();
      showInfoGroupModal(sheet, allChars);
    });
  });

  // 角色上移下移
  body.querySelectorAll('.info-char-move').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var gidx = parseInt(this.getAttribute('data-gidx'));
      var cidx = parseInt(this.getAttribute('data-cidx'));
      var dir = this.getAttribute('data-dir');
      var arr = sheet.groups[gidx].charIds;
      if (dir === 'up' && cidx > 0) {
        var tmp = arr[cidx]; arr[cidx] = arr[cidx - 1]; arr[cidx - 1] = tmp;
      } else if (dir === 'down' && cidx < arr.length - 1) {
        var tmp = arr[cidx]; arr[cidx] = arr[cidx + 1]; arr[cidx + 1] = tmp;
      }
      saveData();
      showInfoGroupModal(sheet, allChars);
    });
  });

  // 移除角色出分组
  body.querySelectorAll('.info-char-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var gidx = parseInt(this.getAttribute('data-gidx'));
      var cidx = parseInt(this.getAttribute('data-cidx'));
      sheet.groups[gidx].charIds.splice(cidx, 1);
      saveData();
      showInfoGroupModal(sheet, allChars);
    });
  });

  // 添加角色到分组
  body.querySelectorAll('.info-modal-add-char').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var gidx = parseInt(this.getAttribute('data-gidx'));
      showInfoAddCharModal(sheet, allChars, gidx);
    });
  });

  // 完成
  document.getElementById('infoGroupDoneBtn').addEventListener('click', function() {
    overlay.classList.remove('active');
    renderInfoEdit(sheet.id);
  });
}

// ===== 添加角色到分组的子弹窗 =====
function showInfoAddCharModal(sheet, allChars, gidx) {
  // 收集已分组的角色ID
  var groupedIds = [];
  for (var g = 0; g < sheet.groups.length; g++) {
    for (var k = 0; k < sheet.groups[g].charIds.length; k++) {
      groupedIds.push(sheet.groups[g].charIds[k]);
    }
  }

  // 未分组角色
  var available = [];
  for (var i = 0; i < allChars.length; i++) {
    if (groupedIds.indexOf(allChars[i].id) < 0) {
      available.push(allChars[i]);
    }
  }

  if (available.length === 0) {
    showToast('没有可添加的角色');
    return;
  }

  var overlay = document.getElementById('modalOverlay');
  var body = document.getElementById('modalBody');
  var actions = document.getElementById('modalActions');

  var h = '<div style="text-align:left;max-height:50vh;overflow-y:auto;">';
  h += '<p style="text-align:center;margin-bottom:12px;">选择要添加到「' + escapeHtml(sheet.groups[gidx].name) + '」的角色</p>';
  for (var i = 0; i < available.length; i++) {
    h += '<div class="info-add-char-item" data-charid="' + available[i].id + '" style="padding:10px 8px;border-bottom:1px solid var(--border);cursor:pointer;">';
    h += escapeHtml(available[i].name);
    h += '<span style="font-size:12px;color:var(--text-secondary);margin-left:8px;">' + escapeHtml(available[i].className) + '</span>';
    h += '</div>';
  }
  h += '</div>';

  body.innerHTML = h;
  actions.innerHTML = '<button class="modal-btn" id="infoAddCharCancelBtn">返回</button>';

  body.querySelectorAll('.info-add-char-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var charId = this.getAttribute('data-charid');
      sheet.groups[gidx].charIds.push(charId);
      saveData();
      showInfoGroupModal(sheet, allChars);
    });
  });

  document.getElementById('infoAddCharCancelBtn').addEventListener('click', function() {
    showInfoGroupModal(sheet, allChars);
  });
}

// ===== 导出文本生成 =====
function generateInfoExportText(sheet, allChars) {
  var lines = [];
  var title = sheet.title || '未命名信息表';
  lines.push(title);
  lines.push('');

  // 收集已分组的角色ID
  var groupedIds = [];
  for (var g = 0; g < sheet.groups.length; g++) {
    for (var k = 0; k < sheet.groups[g].charIds.length; k++) {
      groupedIds.push(sheet.groups[g].charIds[k]);
    }
  }

  // 按分组输出
  for (var g = 0; g < sheet.groups.length; g++) {
    var grp = sheet.groups[g];
    lines.push('【' + grp.name + '】');
    for (var k = 0; k < grp.charIds.length; k++) {
      var charInfo = findCharInfoById(allChars, grp.charIds[k]);
      if (!charInfo) continue;
      var val = (sheet.values && sheet.values[grp.charIds[k]]) || '';
      lines.push(charInfo.name + '：' + val);
    }
    lines.push('');
  }

  // 未分组角色
  var ungrouped = [];
  for (var i = 0; i < allChars.length; i++) {
    if (groupedIds.indexOf(allChars[i].id) < 0) {
      ungrouped.push(allChars[i]);
    }
  }

  if (ungrouped.length > 0) {
    if (sheet.groups.length > 0) {
      lines.push('【未分组】');
    }
    for (var i = 0; i < ungrouped.length; i++) {
      var val = (sheet.values && sheet.values[ungrouped[i].id]) || '';
      lines.push(ungrouped[i].name + '：' + val);
    }
    lines.push('');
  }

  return lines.join('\n').replace(/\n+$/, '');
}

// ===== 导出预览页 =====
function renderInfoPreview(text) {
  var page = document.getElementById('pageInfoPreview');
  var h = '<div class="page-content">';

  h += '<div class="preview-topbar">';
  h += '<button class="back-btn" id="infoPreviewBackBtn">\u2190 返回</button>';
  h += '<div class="preview-actions">';
  h += '<button class="preview-btn" id="infoPreviewCopyBtn">复制</button>';
  h += '<button class="preview-btn" id="infoPreviewDownloadBtn">下载</button>';
  h += '</div></div>';

  h += '<textarea class="preview-textarea" id="infoPreviewText">' + escapeHtml(text) + '</textarea>';
  h += '</div>';
  page.innerHTML = h;

  document.getElementById('infoPreviewBackBtn').addEventListener('click', function() {
    navigateTo('infoList');
  });

  document.getElementById('infoPreviewCopyBtn').addEventListener('click', function() {
    var text = document.getElementById('infoPreviewText').value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showToast('已复制');
      }).catch(function() {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      document.getElementById('infoPreviewText').select();
      document.execCommand('copy');
      showToast('已复制');
    }
  });

  document.getElementById('infoPreviewDownloadBtn').addEventListener('click', function() {
    var blob = new Blob([document.getElementById('infoPreviewText').value], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '信息表导出.txt';
    a.click();
    showToast('已下载');
  });
}