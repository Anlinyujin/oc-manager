// ===== 角色编辑页 =====
function renderCharEdit(data) {
  var page = document.getElementById('pageCharEdit');
  var char = findCharacter(data.charId);
  if (!char) { navigateTo('charList'); return; }

  var h = '<div class="note-edit-page">';
  // 独立导航栏（和笔记编辑页同款）
  h += '<div class="note-edit-topnav">';
  h += '<button class="btn-icon note-corner" data-action="back" title="返回">‹</button>';
  h += '<button class="btn-icon note-corner" data-action="delete-char" data-id="' + char.id + '" title="删除角色">▲</button>';
  h += '</div>';

  h += '<div class="note-edit-body char-edit-body">';

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
  h += '<div class="section"><div class="section-title">相关信息</div><div id="relatedInfoList"></div>';
  h += '<button class="add-item-btn" data-action="add-info">⊕ 添加一条</button></div>';

  // 人际关系
  h += '<div class="section"><div class="section-title">人际关系</div>';
  h += textareaRow('社交总览', 'relationships.overview', char.relationships.overview);
  h += '<div id="relationshipsList"></div>';
  h += '<button class="add-item-btn" data-action="add-relation">⊕ 添加关系人</button></div>';

  h += '</div>'; // note-edit-body
  h += '</div>'; // note-edit-page
  page.innerHTML = h;

  // 绑定字段变化
  page.querySelectorAll('.field-input[data-field]').forEach(function(input) {
    input.addEventListener('input', function() {
      var f = input.dataset.field, v = input.value;
      if (f.indexOf('appearance.') === 0) char.appearance[f.split('.')[1]] = v;
      else if (f.indexOf('relationships.') === 0) char.relationships[f.split('.')[1]] = v;
      else char[f] = v;
      triggerAutoSave();
    });
  });

  // 按钮事件
  page.querySelector('[data-action="back"]').addEventListener('click', function() { navigateTo('charList'); });
  page.querySelector('[data-action="delete-char"]').addEventListener('click', function() {
    var n = char.name || '未命名角色';
    showModal({ message: '确定删除「' + n + '」吗？', buttons: [{ text: '取消' }, { text: '删除', danger: true }] }).then(function(r) {
      if (r.index === 1) {
        var loc = findCharLocation(char.id);
        if (loc) { appData.classes[loc.ci].characters.splice(loc.chi, 1); saveData(); showToast('已删除'); navigateTo('charList'); }
      }
    });
  });
  page.querySelector('[data-action="add-info"]').addEventListener('click', function() {
    char.relatedInfo.push('');
    triggerAutoSave();
    renderRelatedInfoList(char);
  });
  page.querySelector('[data-action="add-relation"]').addEventListener('click', function() {
    char.relationships.entries.push({ target: '', definition: '', description: '' });
    triggerAutoSave();
    renderRelationshipsList(char);
  });

  renderRelatedInfoList(char);
  renderRelationshipsList(char);
}
