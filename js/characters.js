// ===== 人设卡功能 =====

let charExportMode = false;
let charExportSelection = [];

function renderCharList() {
  const page = document.getElementById('pageCharList');
  let h = '<div class="page-content">';
  h += '<div class="action-bar" id="charActionBar">';
  if (charExportMode) {
    h += '<button class="action-btn" id="charExitExportBtn">✕ 取消</button>';
  } else {
    h += '<button class="action-btn" id="charExportBtn">导出</button>';
    h += '<button class="action-btn" id="charSaveBtn">保存</button>';
  }
  h += '</div>';

  if (!charExportMode) {
    // 紧凑模式开关
    h += '<div class="toggle-row"><span class="toggle-label">紧凑导出模式</span>';
    h += `<div class="toggle-switch ${appData.compactExport ? 'active' : ''}" id="compactToggle"></div></div>`;
  }

  h += '<div id="charClassList">';
  appData.classes.forEach((cls, ci) => {
    h += `<div class="class-group">`;
    h += `<div class="class-header">`;
    h += `<div class="class-header-left" data-action="toggle-class" data-ci="${ci}">`;
    h += `<svg class="class-arrow ${cls.collapsed?'collapsed':''}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6,4 12,10 6,16"/></svg>`;
    h += `<span class="class-name">${escapeHtml(cls.name)}</span>`;
    h += `<span class="class-count">${cls.characters.length}</span>`;
    h += `</div>`;
    if (!charExportMode) {
      h += `<div class="class-actions">`;
      h += `<button class="small-btn" data-action="class-up" data-ci="${ci}">${ICONS.up}</button>`;
      h += `<button class="small-btn" data-action="class-down" data-ci="${ci}">${ICONS.down}</button>`;
      h += `<button class="small-btn" data-action="class-more" data-ci="${ci}">${ICONS.more}</button>`;
      h += `</div>`;
    }
    h += `</div>`;
    h += `<div class="class-body ${cls.collapsed ? 'collapsed' : ''}">`;
    cls.characters.forEach((char, chi) => {
      if (charExportMode) {
        const selIdx = charExportSelection.indexOf(char.id);
        h += `<div class="character-item" data-action="toggle-export" data-id="${char.id}">`;
        h += `<div class="character-item-left" style="padding-left:0">`;
        h += `<div class="select-circle ${selIdx>=0?'selected':''}">${selIdx>=0?(selIdx+1):''}</div>`;
        h += `<span class="char-name" style="padding-left:0">${escapeHtml(char.name||'未命名角色')}</span>`;
        h += `</div></div>`;
      } else {
        h += `<div class="character-item">`;
        h += `<div class="character-item-left" data-action="edit-char" data-class-id="${cls.id}" data-char-id="${char.id}">`;
        h += `<span class="char-name">${escapeHtml(char.name||'未命名角色')}</span>`;
        h += `</div>`;
        h += `<div class="char-actions">`;
        h += `<button class="small-btn" data-action="char-up" data-ci="${ci}" data-chi="${chi}">${ICONS.up}</button>`;
        h += `<button class="small-btn" data-action="char-down" data-ci="${ci}" data-chi="${chi}">${ICONS.down}</button>`;
        h += `<button class="small-btn" data-action="char-more" data-ci="${ci}" data-chi="${chi}">${ICONS.more}</button>`;
        h += `</div></div>`;
      }
    });
    if (!charExportMode) {
      h += `<div class="add-character-btn" data-action="add-char" data-ci="${ci}"><span>⊕</span> 新建角色</div>`;
    }
    h += `</div></div>`;
  });
  h += '</div>';
  if (!charExportMode) {
    h += '<div class="add-class-btn" data-action="add-class"><span>⊕</span> 新建班级</div>';
  }
  h += '</div>';
  page.innerHTML = h;

  // 绑定事件
  page.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleCharAction);
  });

  if (!charExportMode) {
    document.getElementById('charExportBtn')?.addEventListener('click', () => {
      charExportMode = true;
      charExportSelection = [];
      appData.classes.forEach(c => c.collapsed = false);
      document.getElementById('exportBottomBar').classList.add('visible');
      updateExportCount();
      renderCharList();
    });
    document.getElementById('charSaveBtn')?.addEventListener('click', () => { saveData(); showToast('已保存'); });
    document.getElementById('compactToggle')?.addEventListener('click', function() {
      appData.compactExport = !appData.compactExport;
      this.classList.toggle('active');
      triggerAutoSave();
    });
  } else {
    document.getElementById('charExitExportBtn')?.addEventListener('click', () => {
      charExportMode = false;
      charExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
      renderCharList();
    });
  }

  // 设置class-body高度
  page.querySelectorAll('.class-body:not(.collapsed)').forEach(body => {
    body.style.maxHeight = (body.scrollHeight + 2000) + 'px';
  });
}

async function handleCharAction(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  e.stopPropagation();
  const action = el.dataset.action;
  const ci = parseInt(el.dataset.ci);
  const chi = parseInt(el.dataset.chi);

  switch(action) {
    case 'toggle-class':
      if (charExportMode) return;
      appData.classes[ci].collapsed = !appData.classes[ci].collapsed;
      triggerAutoSave();
      renderCharList();
      break;

    case 'class-up':
      if (ci > 0) { [appData.classes[ci-1], appData.classes[ci]] = [appData.classes[ci], appData.classes[ci-1]]; saveData(); renderCharList(); }
      break;

    case 'class-down':
      if (ci < appData.classes.length-1) { [appData.classes[ci], appData.classes[ci+1]] = [appData.classes[ci+1], appData.classes[ci]]; saveData(); renderCharList(); }
      break;

    case 'class-more': {
      const cls = appData.classes[ci];
      const r = await showModal({ message: `「${cls.name}」`, buttons: [{ text: '重命名', primary: true }, { text: '删除', danger: true }, { text: '取消' }] });
      if (r.index === 0) {
        const r2 = await showModal({ message: '重命名班级', input: true, inputValue: cls.name, buttons: [{ text: '取消' }, { text: '确定', primary: true }] });
        if (r2.index === 1 && r2.value?.trim()) { cls.name = r2.value.trim(); saveData(); renderCharList(); }
      } else if (r.index === 1) {
        const cnt = cls.characters.length;
        const r2 = await showModal({ message: cnt > 0 ? `确定删除「${cls.name}」及其中的 ${cnt} 个角色吗？` : `确定删除「${cls.name}」吗？`, buttons: [{ text: '取消' }, { text: '删除', danger: true }] });
        if (r2.index === 1) { appData.classes.splice(ci, 1); saveData(); renderCharList(); showToast('已删除'); }
      }
      break;
    }

    case 'char-up':
      if (chi > 0) { const chars = appData.classes[ci].characters; [chars[chi-1], chars[chi]] = [chars[chi], chars[chi-1]]; saveData(); renderCharList(); }
      break;

    case 'char-down': {
      const chars = appData.classes[ci].characters;
      if (chi < chars.length-1) { [chars[chi], chars[chi+1]] = [chars[chi+1], chars[chi]]; saveData(); renderCharList(); }
      break;
    }

    case 'char-more': {
      const char = appData.classes[ci].characters[chi];
      const cn = char.name || '未命名角色';
      const r = await showModal({ message: `「${cn}」`, buttons: [{ text: '删除', danger: true }, { text: '取消' }] });
      if (r.index === 0) {
        const r2 = await showModal({ message: `确定删除「${cn}」吗？`, buttons: [{ text: '取消' }, { text: '删除', danger: true }] });
        if (r2.index === 1) { appData.classes[ci].characters.splice(chi, 1); saveData(); renderCharList(); showToast('已删除'); }
      }
      break;
    }

    case 'add-char': {
      const nc = createCharacter();
      appData.classes[ci].characters.push(nc);
      if (appData.classes[ci].collapsed) appData.classes[ci].collapsed = false;
      saveData();
      navigateTo('charEdit', { classId: appData.classes[ci].id, charId: nc.id });
      break;
    }

    case 'add-class': {
      const r = await showModal({ message: '新建班级', input: true, inputValue: '', buttons: [{ text: '取消' }, { text: '创建', primary: true }] });
      if (r.index === 1) { appData.classes.push(createClass(r.value?.trim() || '未命名班级')); saveData(); renderCharList(); }
      break;
    }

    case 'edit-char':
      navigateTo('charEdit', { classId: el.dataset.classId, charId: el.dataset.charId });
      break;

    case 'toggle-export': {
      const id = el.dataset.id;
      const i = charExportSelection.indexOf(id);
      if (i >= 0) charExportSelection.splice(i, 1);
      else charExportSelection.push(id);
      updateExportCount();
      renderCharList();
      break;
    }
  }
}

function updateExportCount() {
  document.getElementById('exportConfirmBtn').textContent = `确认导出 (${charExportSelection.length})`;
}

function generateExportXML(ids, compact) {
  let xml = '';
  ids.forEach((id, idx) => {
    const c = findCharacter(id);
    if (!c) return;
    if (idx > 0) xml += compact ? '\n' : '\n\n';

    if (compact) {
      xml += `<角色 name="${escapeXml(c.name||'未命名')}">`;
      xml += `<基本信息>`;
      if (c.name) xml += `<姓名>${escapeXml(c.name)}</姓名>`;
      if (c.gender) xml += `<性别>${escapeXml(c.gender)}</性别>`;
      if (c.age) xml += `<年龄>${escapeXml(c.age)}</年龄>`;
      xml += `</基本信息>`;
      if (c.className || c.position || c.seat) {
        xml += `<班级信息>`;
        if (c.className) xml += `<班级>${escapeXml(c.className)}</班级>`;
        if (c.position) xml += `<职位>${escapeXml(c.position)}</职位>`;
        if (c.seat) xml += `<座位>${escapeXml(c.seat)}</座位>`;
        xml += `</班级信息>`;
      }
      const ap = c.appearance;
      if (ap.hairstyle || ap.eyeColor || ap.height || ap.features || ap.outfit || ap.other) {
        xml += `<外观>`;
        if (ap.hairstyle) xml += `<发型>${escapeXml(ap.hairstyle)}</发型>`;
        if (ap.eyeColor) xml += `<瞳色>${escapeXml(ap.eyeColor)}</瞳色>`;
        if (ap.height) xml += `<身高>${escapeXml(ap.height)}</身高>`;
        if (ap.features) xml += `<五官>${escapeXml(ap.features)}</五官>`;
        if (ap.outfit) xml += `<穿搭>${escapeXml(ap.outfit)}</穿搭>`;
        if (ap.other) xml += `<其他>${escapeXml(ap.other)}</其他>`;
        xml += `</外观>`;
      }
      if (c.background) xml += `<背景>${escapeXml(c.background)}</背景>`;
      const validInfo = c.relatedInfo.filter(i => i.trim());
      if (validInfo.length > 0) {
        xml += `<相关信息>`;
        validInfo.forEach((info, i) => xml += `<条目${i+1}>${escapeXml(info)}</条目${i+1}>`);
        xml += `</相关信息>`;
      }
      if (c.relationships.overview || c.relationships.entries.length > 0) {
        xml += `<人际关系>`;
        if (c.relationships.overview) xml += `<社交总览>${escapeXml(c.relationships.overview)}</社交总览>`;
        c.relationships.entries.forEach(e => {
          if (e.target || e.description) {
            const def = e.definition ? ` 定义="${escapeXml(e.definition)}"` : '';
            xml += `<关系 对象="${escapeXml(e.target)}"${def}>${escapeXml(e.description)}</关系>`;
          }
        });
        xml += `</人际关系>`;
      }
      xml += `</角色>`;
    } else {
      xml += `<角色 name="${escapeXml(c.name||'未命名')}">\n`;
      xml += `<基本信息>\n`;
      if (c.name) xml += `  <姓名>${escapeXml(c.name)}</姓名>\n`;
      if (c.gender) xml += `  <性别>${escapeXml(c.gender)}</性别>\n`;
      if (c.age) xml += `  <年龄>${escapeXml(c.age)}</年龄>\n`;
      xml += `</基本信息>\n`;
      if (c.className || c.position || c.seat) {
        xml += `<班级信息>\n`;
        if (c.className) xml += `  <班级>${escapeXml(c.className)}</班级>\n`;
        if (c.position) xml += `  <职位>${escapeXml(c.position)}</职位>\n`;
        if (c.seat) xml += `  <座位>${escapeXml(c.seat)}</座位>\n`;
        xml += `</班级信息>\n`;
      }
      const ap = c.appearance;
      if (ap.hairstyle || ap.eyeColor || ap.height || ap.features || ap.outfit || ap.other) {
        xml += `<外观>\n`;
        if (ap.hairstyle) xml += `  <发型>${escapeXml(ap.hairstyle)}</发型>\n`;
        if (ap.eyeColor) xml += `  <瞳色>${escapeXml(ap.eyeColor)}</瞳色>\n`;
        if (ap.height) xml += `  <身高>${escapeXml(ap.height)}</身高>\n`;
        if (ap.features) xml += `  <五官>${escapeXml(ap.features)}</五官>\n`;
        if (ap.outfit) xml += `  <穿搭>${escapeXml(ap.outfit)}</穿搭>\n`;
        if (ap.other) xml += `  <其他>${escapeXml(ap.other)}</其他>\n`;
        xml += `</外观>\n`;
      }
      if (c.background) xml += `<背景>\n  ${escapeXml(c.background)}\n</背景>\n`;
      const validInfo = c.relatedInfo.filter(i => i.trim());
      if (validInfo.length > 0) {
        xml += `<相关信息>\n`;
        validInfo.forEach((info, i) => xml += `  <条目${i+1}>${escapeXml(info)}</条目${i+1}>\n`);
        xml += `</相关信息>\n`;
      }
      if (c.relationships.overview || c.relationships.entries.length > 0) {
        xml += `<人际关系>\n`;
        if (c.relationships.overview) xml += `  <社交总览>${escapeXml(c.relationships.overview)}</社交总览>\n`;
        c.relationships.entries.forEach(e => {
          if (e.target || e.description) {
            const def = e.definition ? ` 定义="${escapeXml(e.definition)}"` : '';
            xml += `  <关系 对象="${escapeXml(e.target)}"${def}>\n    ${escapeXml(e.description)}\n  </关系>\n`;
          }
        });
        xml += `</人际关系>\n`;
      }
      xml += `</角色>`;
    }
  });
  return xml;
}

// ===== 角色编辑页 =====
function renderCharEdit(data) {
  const page = document.getElementById('pageCharEdit');
  const char = findCharacter(data.charId);
  if (!char) { navigateTo('charList'); return; }

  let h = '<div class="page-content">';
  h += `<div class="edit-topbar"><button class="back-btn" data-action="back">← 返回</button><button class="delete-btn" data-action="delete-char" data-id="${char.id}">删除角色</button></div>`;

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
  h += `<div class="field-row"><textarea class="field-input large" data-field="background">${escapeHtml(char.background)}</textarea></div>`;
  h += '</div>';

  // 相关信息
  h += '<div class="section"><div class="section-title">相关信息</div><div id="relatedInfoList"></div>';
  h += '<button class="add-item-btn" data-action="add-info">⊕ 添加一条</button></div>';

  // 人际关系
  h += '<div class="section"><div class="section-title">人际关系</div>';
  h += textareaRow('社交总览', 'relationships.overview', char.relationships.overview);
  h += '<div id="relationshipsList"></div>';
  h += '<button class="add-item-btn" data-action="add-relation">⊕ 添加关系人</button></div>';

  h += '</div>';
  page.innerHTML = h;

  // 绑定字段变化
  page.querySelectorAll('.field-input[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      const f = input.dataset.field, v = input.value;
      if (f.startsWith('appearance.')) char.appearance[f.split('.')[1]] = v;
      else if (f.startsWith('relationships.')) char.relationships[f.split('.')[1]] = v;
      else char[f] = v;
      triggerAutoSave();
    });
  });

  // 按钮事件
  page.querySelector('[data-action="back"]').addEventListener('click', () => navigateTo('charList'));
  page.querySelector('[data-action="delete-char"]').addEventListener('click', async () => {
    const n = char.name || '未命名角色';
    const r = await showModal({ message: `确定删除「${n}」吗？`, buttons: [{ text: '取消' }, { text: '删除', danger: true }] });
    if (r.index === 1) {
      const loc = findCharLocation(char.id);
      if (loc) { appData.classes[loc.ci].characters.splice(loc.chi, 1); saveData(); showToast('已删除'); navigateTo('charList'); }
    }
  });
  page.querySelector('[data-action="add-info"]').addEventListener('click', () => {
    char.relatedInfo.push('');
    triggerAutoSave();
    renderRelatedInfoList(char);
  });
  page.querySelector('[data-action="add-relation"]').addEventListener('click', () => {
    char.relationships.entries.push({ target: '', definition: '', description: '' });
    triggerAutoSave();
    renderRelationshipsList(char);
  });

  renderRelatedInfoList(char);
  renderRelationshipsList(char);
}

function fieldRow(label, field, value) {
  return `<div class="field-row"><div class="field-label">${label}</div><input class="field-input" data-field="${field}" value="${escapeHtml(value)}"></div>`;
}

function textareaRow(label, field, value) {
  return `<div class="field-row"><div class="field-label">${label}</div><textarea class="field-input" data-field="${field}">${escapeHtml(value)}</textarea></div>`;
}

function renderRelatedInfoList(char) {
  const c = document.getElementById('relatedInfoList');
  if (!c) return;
  c.innerHTML = '';
  char.relatedInfo.forEach((info, i) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<span class="list-item-number">${i+1}.</span><div class="list-item-content"><textarea class="field-input">${escapeHtml(info)}</textarea></div><button class="list-item-delete">✕</button>`;
    item.querySelector('textarea').addEventListener('input', e => { char.relatedInfo[i] = e.target.value; triggerAutoSave(); });
    item.querySelector('.list-item-delete').addEventListener('click', () => { char.relatedInfo.splice(i, 1); triggerAutoSave(); renderRelatedInfoList(char); });
    c.appendChild(item);
  });
}

function renderRelationshipsList(char) {
  const c = document.getElementById('relationshipsList');
  if (!c) return;
  c.innerHTML = '';
  char.relationships.entries.forEach((entry, i) => {
    const card = document.createElement('div');
    card.className = 'relation-card';
    card.innerHTML = `<div class="relation-card-top"><div class="relation-card-fields">
      <div class="field-row" style="margin-bottom:8px"><div class="field-label">对象</div><input class="field-input" data-rf="target" value="${escapeHtml(entry.target)}"></div>
      <div class="field-row" style="margin-bottom:0"><div class="field-label">关系定义</div><input class="field-input" data-rf="definition" value="${escapeHtml(entry.definition)}"></div>
    </div><button class="relation-card-delete">✕</button></div>
    <div class="field-row" style="margin-top:8px"><div class="field-label">详细描述</div><textarea class="field-input large" data-rf="description">${escapeHtml(entry.description)}</textarea></div>`;
    card.querySelectorAll('[data-rf]').forEach(inp => {
      inp.addEventListener('input', () => { entry[inp.dataset.rf] = inp.value; triggerAutoSave(); });
    });
    card.querySelector('.relation-card-delete').addEventListener('click', () => {
      char.relationships.entries.splice(i, 1);
      triggerAutoSave();
      renderRelationshipsList(char);
    });
    c.appendChild(card);
  });
}

// ===== 角色导出预览 =====
function renderCharPreview(text) {
  const page = document.getElementById('pageCharPreview');
  let h = '<div class="page-content">';
  h += '<div class="preview-topbar"><button class="back-btn" id="previewBackBtn">← 返回</button>';
  h += '<div class="preview-actions"><button class="preview-btn" id="previewCopyBtn">复制</button><button class="preview-btn" id="previewDownloadBtn">下载</button></div></div>';
  h += `<textarea class="preview-textarea" id="previewText">${escapeHtml(text)}</textarea>`;
  h += '</div>';
  page.innerHTML = h;

  document.getElementById('previewBackBtn').addEventListener('click', () => navigateTo('charList'));
  document.getElementById('previewCopyBtn').addEventListener('click', () => {
    const text = document.getElementById('previewText').value;
    navigator.clipboard.writeText(text).then(() => showToast('已复制')).catch(() => {
      document.getElementById('previewText').select();
      document.execCommand('copy');
      showToast('已复制');
    });
  });
  document.getElementById('previewDownloadBtn').addEventListener('click', () => {
    const blob = new Blob([document.getElementById('previewText').value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'OC人设卡导出.txt';
    a.click();
    showToast('已下载');
  });
}
