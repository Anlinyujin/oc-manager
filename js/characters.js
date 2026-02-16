// ===== 全局变量 =====
var charExportMode = false;
var charExportSelection = [];

// ===== 辅助函数 =====
function fieldRow(label, field, value) {
  return '<div class="field-row">' +
    '<div class="field-label">' + label + '</div>' +
    '<input class="field-input" data-field="' + field + '" value="' + escapeHtml(value) + '">' +
    '</div>';
}

function textareaRow(label, field, value) {
  return '<div class="field-row">' +
    '<div class="field-label">' + label + '</div>' +
    '<textarea class="field-input" data-field="' + field + '">' + escapeHtml(value) + '</textarea>' +
    '</div>';
}

function escapeXml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== 人设卡列表页 =====
function renderCharList() {
  var page = document.getElementById('pageCharList');
  var h = '<div class="page-content">';

  // 顶部操作栏
  h += '<div class="action-bar" id="charActionBar">';
  if (charExportMode) {
    h += '<button class="action-btn" id="charExitExportBtn">\u2715 取消</button>';
  } else {
    h += '<button class="action-btn" id="charExportBtn">导出</button>';
    h += '<button class="action-btn" id="charSaveBtn">保存</button>';
  }
  h += '</div>';

  // 紧凑模式开关
  if (!charExportMode) {
    h += '<div class="toggle-row">';
    h += '<span class="toggle-label">紧凑导出模式</span>';
    h += '<div class="toggle-switch ' + (appData.compactExport ? 'active' : '') + '" id="compactToggle"></div>';
    h += '</div>';
  }

  // 班级列表
  h += '<div id="charClassList">';
  appData.classes.forEach(function(cls, ci) {
    h += renderClassGroup(cls, ci);
  });
  h += '</div>';

  // 新建班级按钮
  if (!charExportMode) {
    h += '<div class="add-class-btn" data-action="add-class"><span>\u2295</span> 新建班级</div>';
  }

  h += '</div>';
  page.innerHTML = h;

  bindCharListEvents(page);
}

// ----- 渲染单个班级分组 -----
function renderClassGroup(cls, ci) {
  var h = '<div class="class-group">';

  // 班级标题行
  h += '<div class="class-header">';
  h += '<div class="class-header-left" data-action="toggle-class" data-ci="' + ci + '">';
  h += '<svg class="class-arrow ' + (cls.collapsed ? 'collapsed' : '') + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>';
  h += '<span class="class-name">' + escapeHtml(cls.name) + '</span>';
  h += '<span class="class-count">' + cls.characters.length + '</span>';
  h += '</div>';

  if (!charExportMode) {
    h += '<div class="class-actions">';
    h += '<button class="small-btn" data-action="class-up" data-ci="' + ci + '">' + ICONS.up + '</button>';
    h += '<button class="small-btn" data-action="class-down" data-ci="' + ci + '">' + ICONS.down + '</button>';
    h += '<button class="small-btn" data-action="class-more" data-ci="' + ci + '">' + ICONS.more + '</button>';
    h += '</div>';
  }
  h += '</div>';

  // 班级内容（角色列表）
  h += '<div class="class-body ' + (cls.collapsed ? 'collapsed' : '') + '">';
  cls.characters.forEach(function(char, chi) {
    h += renderCharacterItem(cls, ci, char, chi);
  });

  if (!charExportMode) {
    h += '<div class="add-character-btn" data-action="add-char" data-ci="' + ci + '"><span>\u2295</span> 新建角色</div>';
  }
  h += '</div>';

  h += '</div>';
  return h;
}

// ----- 渲染单个角色行 -----
function renderCharacterItem(cls, ci, char, chi) {
  var h = '';
  if (charExportMode) {
    var selIdx = charExportSelection.indexOf(char.id);
    h += '<div class="character-item" data-action="toggle-export" data-id="' + char.id + '">';
    h += '<div class="character-item-left" style="padding-left:0">';
    h += '<div class="select-circle ' + (selIdx >= 0 ? 'selected' : '') + '">' + (selIdx >= 0 ? (selIdx + 1) : '') + '</div>';
    h += '<span class="char-name" style="padding-left:0">' + escapeHtml(char.name || '未命名角色') + '</span>';
    h += '</div></div>';
  } else {
    h += '<div class="character-item">';
    h += '<div class="character-item-left" data-action="edit-char" data-class-id="' + cls.id + '" data-char-id="' + char.id + '">';
    h += '<span class="char-name">' + escapeHtml(char.name || '未命名角色') + '</span>';
    h += '</div>';
    h += '<div class="char-actions">';
    h += '<button class="small-btn" data-action="char-up" data-ci="' + ci + '" data-chi="' + chi + '">' + ICONS.up + '</button>';
    h += '<button class="small-btn" data-action="char-down" data-ci="' + ci + '" data-chi="' + chi + '">' + ICONS.down + '</button>';
    h += '<button class="small-btn" data-action="char-more" data-ci="' + ci + '" data-chi="' + chi + '">' + ICONS.more + '</button>';
    h += '</div></div>';
  }
  return h;
}

// ----- 绑定列表页事件 -----
function bindCharListEvents(page) {
  // 通用 data-action 事件
  page.querySelectorAll('[data-action]').forEach(function(el) {
    el.addEventListener('click', handleCharAction);
  });

  if (!charExportMode) {
    var exportBtn = document.getElementById('charExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', function() {
      charExportMode = true;
      charExportSelection = [];
      appData.classes.forEach(function(c) { c.collapsed = false; });
      document.getElementById('exportBottomBar').classList.add('visible');
      updateExportCount();
      renderCharList();
    });

    var saveBtn = document.getElementById('charSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', function() {
      saveData();
      showToast('已保存');
    });

    var compactToggle = document.getElementById('compactToggle');
    if (compactToggle) compactToggle.addEventListener('click', function() {
      appData.compactExport = !appData.compactExport;
      this.classList.toggle('active');
      triggerAutoSave();
    });
  } else {
    var exitBtn = document.getElementById('charExitExportBtn');
    if (exitBtn) exitBtn.addEventListener('click', function() {
      charExportMode = false;
      charExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
      renderCharList();
    });
  }

  // 展开状态的 class-body 设置高度动画
  page.querySelectorAll('.class-body:not(.collapsed)').forEach(function(body) {
    body.style.maxHeight = (body.scrollHeight + 2000) + 'px';
  });
}

// ===== 列表页操作处理 =====
function handleCharAction(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  e.stopPropagation();

  var action = el.dataset.action;
  var ci = parseInt(el.dataset.ci);
  var chi = parseInt(el.dataset.chi);

  switch (action) {
    case 'toggle-class':
      if (charExportMode) return;
      appData.classes[ci].collapsed = !appData.classes[ci].collapsed;
      triggerAutoSave();
      renderCharList();
      break;

    case 'class-up':
      if (ci > 0) {
        var temp = appData.classes[ci];
        appData.classes[ci] = appData.classes[ci - 1];
        appData.classes[ci - 1] = temp;
        saveData();
        renderCharList();
      }
      break;

    case 'class-down':
      if (ci < appData.classes.length - 1) {
        var temp = appData.classes[ci];
        appData.classes[ci] = appData.classes[ci + 1];
        appData.classes[ci + 1] = temp;
        saveData();
        renderCharList();
      }
      break;

    case 'class-more':
      handleClassMore(ci);
      break;

    case 'char-up':
      if (chi > 0) {
        var chars = appData.classes[ci].characters;
        var temp = chars[chi];
        chars[chi] = chars[chi - 1];
        chars[chi - 1] = temp;
        saveData();
        renderCharList();
      }
      break;

    case 'char-down':
      var chars = appData.classes[ci].characters;
      if (chi < chars.length - 1) {
        var temp = chars[chi];
        chars[chi] = chars[chi + 1];
        chars[chi + 1] = temp;
        saveData();
        renderCharList();
      }
      break;

    case 'char-more':
      handleCharMore(ci, chi);
      break;

    case 'add-char':
      var nc = createCharacter();
      appData.classes[ci].characters.push(nc);
      if (appData.classes[ci].collapsed) appData.classes[ci].collapsed = false;
      saveData();
      navigateTo('charEdit', { classId: appData.classes[ci].id, charId: nc.id });
      break;

    case 'add-class':
      showModal({
        message: '新建班级',
        input: true,
        inputValue: '',
        buttons: [{ text: '取消' }, { text: '创建', primary: true }]
      }).then(function(r) {
        if (r.index === 1) {
          var name = r.value && r.value.trim() ? r.value.trim() : '未命名班级';
          appData.classes.push(createClass(name));
          saveData();
          renderCharList();
        }
      });
      break;

    case 'edit-char':
      navigateTo('charEdit', { classId: el.dataset.classId, charId: el.dataset.charId });
      break;

    case 'toggle-export':
      var id = el.dataset.id;
      var i = charExportSelection.indexOf(id);
      if (i >= 0) charExportSelection.splice(i, 1);
      else charExportSelection.push(id);
      updateExportCount();
      renderCharList();
      break;
  }
}

// ----- 班级更多操作 -----
function handleClassMore(ci) {
  var cls = appData.classes[ci];
  showModal({
    message: '\u300c' + cls.name + '\u300d',
    buttons: [
      { text: '重命名', primary: true },
      { text: '删除', danger: true },
      { text: '取消' }
    ]
  }).then(function(r) {
    if (r.index === 0) {
      showModal({
        message: '重命名班级',
        input: true,
        inputValue: cls.name,
        buttons: [{ text: '取消' }, { text: '确定', primary: true }]
      }).then(function(r2) {
        if (r2.index === 1 && r2.value && r2.value.trim()) {
          cls.name = r2.value.trim();
          saveData();
          renderCharList();
        }
      });
    } else if (r.index === 1) {
      var cnt = cls.characters.length;
      var msg = cnt > 0
        ? '确定删除\u300c' + cls.name + '\u300d及其中的 ' + cnt + ' 个角色吗？'
        : '确定删除\u300c' + cls.name + '\u300d吗？';
      showModal({
        message: msg,
        buttons: [{ text: '取消' }, { text: '删除', danger: true }]
      }).then(function(r2) {
        if (r2.index === 1) {
          appData.classes.splice(ci, 1);
          saveData();
          renderCharList();
          showToast('已删除');
        }
      });
    }
  });
}

// ----- 角色更多操作 -----
function handleCharMore(ci, chi) {
  var char = appData.classes[ci].characters[chi];
  var cn = char.name || '未命名角色';
  showModal({
    message: '\u300c' + cn + '\u300d',
    buttons: [{ text: '删除', danger: true }, { text: '取消' }]
  }).then(function(r) {
    if (r.index === 0) {
      showModal({
        message: '确定删除\u300c' + cn + '\u300d吗？',
        buttons: [{ text: '取消' }, { text: '删除', danger: true }]
      }).then(function(r2) {
        if (r2.index === 1) {
          appData.classes[ci].characters.splice(chi, 1);
          saveData();
          renderCharList();
          showToast('已删除');
        }
      });
    }
  });
}

// ----- 导出计数 -----
function updateExportCount() {
  var btn = document.getElementById('exportConfirmBtn');
  if (btn) btn.textContent = '确认导出 (' + charExportSelection.length + ')';
}

// ===== 角色编辑页 =====
function renderCharEdit(data) {
  var page = document.getElementById('pageCharEdit');
  var char = findCharacter(data.charId);
  if (!char) { navigateTo('charList'); return; }

  var h = '<div class="note-edit-page">';

  // 独立导航栏
  h += '<div class="note-edit-topnav">';
  h += '<button class="btn-icon note-corner" data-action="back" title="返回">\u2039</button>';
  h += '<button class="btn-icon note-corner" data-action="delete-char" data-id="' + char.id + '" title="删除角色">\u25b2</button>';
  h += '</div>';

  // 编辑区域
  h += '<div class="note-edit-body char-edit-body" style="padding-top:8px;">';

  // 基本信息
  h += '<div class="section"><div class="section-title">基本信息</div>';
  h += fieldRow('姓名', 'name', char.name);
  h += fieldRow('性别', 'gender', char.gender);
  h += fieldRow('年龄', 'age', char.age);
  h += '</div>';

  // 班级
  h += '<div class="section"><div class="section-title">班级</div>';
  h += fieldRow('班级', 'className', char.className);
  h += fieldRow('职位', 'position', char.position);
  h += fieldRow('座位', 'seat', char.seat);
  h += '</div>';

  // 外观
  h += '<div class="section"><div class="section-title">外观</div>';
  h += fieldRow('发型', 'appearance.hairstyle', char.appearance.hairstyle);
  h += fieldRow('瞳色', 'appearance.eyeColor', char.appearance.eyeColor);
  h += fieldRow('身高', 'appearance.height', char.appearance.height);
  h += fieldRow('五官', 'appearance.features', char.appearance.features);
  h += textareaRow('穿搭', 'appearance.outfit', char.appearance.outfit);
  h += textareaRow('其他外观描述', 'appearance.other', char.appearance.other);
  h += '</div>';

  // 背景
  h += '<div class="section"><div class="section-title">背景</div>';
  h += '<div class="field-row"><textarea class="field-input large" data-field="background">' + escapeHtml(char.background) + '</textarea></div>';
  h += '</div>';

  // 相关信息
  h += '<div class="section"><div class="section-title">相关信息</div>';
  h += '<div id="relatedInfoList"></div>';
  h += '<button class="add-item-btn" data-action="add-info">\u2295 添加一条</button>';
  h += '</div>';

  // 人际关系
  h += '<div class="section"><div class="section-title">人际关系</div>';
  h += textareaRow('社交总览', 'relationships.overview', char.relationships.overview);
  h += '<div id="relationshipsList"></div>';
  h += '<button class="add-item-btn" data-action="add-relation">\u2295 添加关系人</button>';
  h += '</div>';

  h += '</div>'; // note-edit-body
  h += '</div>'; // note-edit-page
  page.innerHTML = h;

  bindCharEditEvents(page, char);
  renderRelatedInfoList(char);
  renderRelationshipsList(char);
}

// ----- 绑定编辑页事件 -----
function bindCharEditEvents(page, char) {
  // 字段变化监听
  page.querySelectorAll('.field-input[data-field]').forEach(function(input) {
    input.addEventListener('input', function() {
      var f = input.dataset.field;
      var v = input.value;
      if (f.indexOf('appearance.') === 0) {
        char.appearance[f.split('.')[1]] = v;
      } else if (f.indexOf('relationships.') === 0) {
        char.relationships[f.split('.')[1]] = v;
      } else {
        char[f] = v;
      }
      triggerAutoSave();
    });
  });

  // 返回按钮
  page.querySelector('[data-action="back"]').addEventListener('click', function() {
    navigateTo('charList');
  });

  // 删除按钮
  page.querySelector('[data-action="delete-char"]').addEventListener('click', function() {
    var n = char.name || '未命名角色';
    showModal({
      message: '确定删除\u300c' + n + '\u300d吗？',
      buttons: [{ text: '取消' }, { text: '删除', danger: true }]
    }).then(function(r) {
      if (r.index === 1) {
        var loc = findCharLocation(char.id);
        if (loc) {
          appData.classes[loc.ci].characters.splice(loc.chi, 1);
          saveData();
          showToast('已删除');
          navigateTo('charList');
        }
      }
    });
  });

  // 添加相关信息
  page.querySelector('[data-action="add-info"]').addEventListener('click', function() {
    char.relatedInfo.push('');
    triggerAutoSave();
    renderRelatedInfoList(char);
  });

  // 添加关系人
  page.querySelector('[data-action="add-relation"]').addEventListener('click', function() {
    char.relationships.entries.push({ target: '', definition: '', description: '' });
    triggerAutoSave();
    renderRelationshipsList(char);
  });
}

// ===== 相关信息列表 =====
function renderRelatedInfoList(char) {
  var c = document.getElementById('relatedInfoList');
  if (!c) return;
  c.innerHTML = '';

  char.relatedInfo.forEach(function(info, i) {
    var item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = '<span class="list-item-number">' + (i + 1) + '.</span>' +
      '<div class="list-item-content"><textarea class="field-input">' + escapeHtml(info) + '</textarea></div>' +
      '<button class="list-item-delete">\u2715</button>';

    item.querySelector('textarea').addEventListener('input', function(e) {
      char.relatedInfo[i] = e.target.value;
      triggerAutoSave();
    });

    item.querySelector('.list-item-delete').addEventListener('click', function() {
      char.relatedInfo.splice(i, 1);
      triggerAutoSave();
      renderRelatedInfoList(char);
    });

    c.appendChild(item);
  });
}

// ===== 人际关系列表 =====
function renderRelationshipsList(char) {
  var c = document.getElementById('relationshipsList');
  if (!c) return;
  c.innerHTML = '';

  char.relationships.entries.forEach(function(entry, i) {
    var card = document.createElement('div');
    card.className = 'relation-card';
    card.innerHTML =
      '<div class="relation-card-top">' +
        '<div class="relation-card-fields">' +
          '<div class="field-row" style="margin-bottom:8px">' +
            '<div class="field-label">对象</div>' +
            '<input class="field-input" data-rf="target" value="' + escapeHtml(entry.target) + '">' +
          '</div>' +
          '<div class="field-row" style="margin-bottom:0">' +
            '<div class="field-label">关系定义</div>' +
            '<input class="field-input" data-rf="definition" value="' + escapeHtml(entry.definition) + '">' +
          '</div>' +
        '</div>' +
        '<button class="relation-card-delete">\u2715</button>' +
      '</div>' +
      '<div class="field-row" style="margin-top:8px">' +
        '<div class="field-label">详细描述</div>' +
        '<textarea class="field-input large" data-rf="description">' + escapeHtml(entry.description) + '</textarea>' +
      '</div>';

    card.querySelectorAll('[data-rf]').forEach(function(inp) {
      inp.addEventListener('input', function() {
        entry[inp.dataset.rf] = inp.value;
        triggerAutoSave();
      });
    });

    card.querySelector('.relation-card-delete').addEventListener('click', function() {
      char.relationships.entries.splice(i, 1);
      triggerAutoSave();
      renderRelationshipsList(char);
    });

    c.appendChild(card);
  });
}

// ===== 导出XML生成 =====
function generateExportXML(ids, compact) {
  var xml = '';
  ids.forEach(function(id, idx) {
    var c = findCharacter(id);
    if (!c) return;
    if (idx > 0) xml += compact ? '\n' : '\n\n';
    xml += compact ? generateCompactXML(c) : generateFormattedXML(c);
  });
  return xml;
}

// ----- 紧凑XML -----
function generateCompactXML(c) {
  var xml = '<角色 name="' + escapeXml(c.name || '未命名') + '">';

  xml += '<基本信息>';
  if (c.name) xml += '<姓名>' + escapeXml(c.name) + '</姓名>';
  if (c.gender) xml += '<性别>' + escapeXml(c.gender) + '</性别>';
  if (c.age) xml += '<年龄>' + escapeXml(c.age) + '</年龄>';
  xml += '</基本信息>';

  if (c.className || c.position || c.seat) {
    xml += '<班级信息>';
    if (c.className) xml += '<班级>' + escapeXml(c.className) + '</班级>';
    if (c.position) xml += '<职位>' + escapeXml(c.position) + '</职位>';
    if (c.seat) xml += '<座位>' + escapeXml(c.seat) + '</座位>';
    xml += '</班级信息>';
  }

  var ap = c.appearance;
  if (ap.hairstyle || ap.eyeColor || ap.height || ap.features || ap.outfit || ap.other) {
    xml += '<外观>';
    if (ap.hairstyle) xml += '<发型>' + escapeXml(ap.hairstyle) + '</发型>';
    if (ap.eyeColor) xml += '<瞳色>' + escapeXml(ap.eyeColor) + '</瞳色>';
    if (ap.height) xml += '<身高>' + escapeXml(ap.height) + '</身高>';
    if (ap.features) xml += '<五官>' + escapeXml(ap.features) + '</五官>';
    if (ap.outfit) xml += '<穿搭>' + escapeXml(ap.outfit) + '</穿搭>';
    if (ap.other) xml += '<其他>' + escapeXml(ap.other) + '</其他>';
    xml += '</外观>';
  }

  if (c.background) xml += '<背景>' + escapeXml(c.background) + '</背景>';

  var validInfo = c.relatedInfo.filter(function(i) { return i.trim(); });
  if (validInfo.length > 0) {
    xml += '<相关信息>';
    validInfo.forEach(function(info, i) {
      xml += '<条目' + (i + 1) + '>' + escapeXml(info) + '</条目' + (i + 1) + '>';
    });
    xml += '</相关信息>';
  }

  if (c.relationships.overview || c.relationships.entries.length > 0) {
    xml += '<人际关系>';
    if (c.relationships.overview) xml += '<社交总览>' + escapeXml(c.relationships.overview) + '</社交总览>';
    c.relationships.entries.forEach(function(e) {
      if (e.target || e.description) {
        var def = e.definition ? ' 定义="' + escapeXml(e.definition) + '"' : '';
        xml += '<关系 对象="' + escapeXml(e.target) + '"' + def + '>' + escapeXml(e.description) + '</关系>';
      }
    });
    xml += '</人际关系>';
  }

  xml += '</角色>';
  return xml;
}

// ----- 格式化XML -----
function generateFormattedXML(c) {
  var xml = '<角色 name="' + escapeXml(c.name || '未命名') + '">\n';

  xml += '<基本信息>\n';
  if (c.name) xml += '  <姓名>' + escapeXml(c.name) + '</姓名>\n';
  if (c.gender) xml += '  <性别>' + escapeXml(c.gender) + '</性别>\n';
  if (c.age) xml += '  <年龄>' + escapeXml(c.age) + '</年龄>\n';
  xml += '</基本信息>\n';

  if (c.className || c.position || c.seat) {
    xml += '<班级信息>\n';
    if (c.className) xml += '  <班级>' + escapeXml(c.className) + '</班级>\n';
    if (c.position) xml += '  <职位>' + escapeXml(c.position) + '</职位>\n';
    if (c.seat) xml += '  <座位>' + escapeXml(c.seat) + '</座位>\n';
    xml += '</班级信息>\n';
  }

  var ap = c.appearance;
  if (ap.hairstyle || ap.eyeColor || ap.height || ap.features || ap.outfit || ap.other) {
    xml += '<外观>\n';
    if (ap.hairstyle) xml += '  <发型>' + escapeXml(ap.hairstyle) + '</发型>\n';
    if (ap.eyeColor) xml += '  <瞳色>' + escapeXml(ap.eyeColor) + '</瞳色>\n';
    if (ap.height) xml += '  <身高>' + escapeXml(ap.height) + '</身高>\n';
    if (ap.features) xml += '  <五官>' + escapeXml(ap.features) + '</五官>\n';
    if (ap.outfit) xml += '  <穿搭>' + escapeXml(ap.outfit) + '</穿搭>\n';
    if (ap.other) xml += '  <其他>' + escapeXml(ap.other) + '</其他>\n';
    xml += '</外观>\n';
  }

  if (c.background) xml += '<背景>\n  ' + escapeXml(c.background) + '\n</背景>\n';

  var validInfo = c.relatedInfo.filter(function(i) { return i.trim(); });
  if (validInfo.length > 0) {
    xml += '<相关信息>\n';
    validInfo.forEach(function(info, i) {
      xml += '  <条目' + (i + 1) + '>' + escapeXml(info) + '</条目' + (i + 1) + '>\n';
    });
    xml += '</相关信息>\n';
  }

  if (c.relationships.overview || c.relationships.entries.length > 0) {
    xml += '<人际关系>\n';
    if (c.relationships.overview) xml += '  <社交总览>' + escapeXml(c.relationships.overview) + '</社交总览>\n';
    c.relationships.entries.forEach(function(e) {
      if (e.target || e.description) {
        var def = e.definition ? ' 定义="' + escapeXml(e.definition) + '"' : '';
        xml += '  <关系 对象="' + escapeXml(e.target) + '"' + def + '>\n    ' + escapeXml(e.description) + '\n  </关系>\n';
      }
    });
    xml += '</人际关系>\n';
  }

  xml += '</角色>';
  return xml;
}

// ===== 导出预览页 =====
function renderCharPreview(text) {
  var page = document.getElementById('pageCharPreview');
  var h = '<div class="page-content">';

  h += '<div class="preview-topbar">';
  h += '<button class="back-btn" id="previewBackBtn">\u2190 返回</button>';
  h += '<div class="preview-actions">';
  h += '<button class="preview-btn" id="previewCopyBtn">复制</button>';
  h += '<button class="preview-btn" id="previewDownloadBtn">下载</button>';
  h += '</div></div>';

  h += '<textarea class="preview-textarea" id="previewText">' + escapeHtml(text) + '</textarea>';
  h += '</div>';
  page.innerHTML = h;

  document.getElementById('previewBackBtn').addEventListener('click', function() {
    navigateTo('charList');
  });

  document.getElementById('previewCopyBtn').addEventListener('click', function() {
    var text = document.getElementById('previewText').value;
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
      document.getElementById('previewText').select();
      document.execCommand('copy');
      showToast('已复制');
    }
  });

  document.getElementById('previewDownloadBtn').addEventListener('click', function() {
    var blob = new Blob([document.getElementById('previewText').value], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'OC人设卡导出.txt';
    a.click();
    showToast('已下载');
  });
}
