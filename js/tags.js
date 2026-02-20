// ===== 标签管理 =====

function renderTagManager() {
  var page = document.getElementById('pageTagManager');
  var tags = getAllTags();

  var h = '<div class="page-content">';

  // 一级标签（自定义）
  h += '<div class="tag-section"><div class="tag-section-title">一级标签</div>';
  h += '<div class="tag-list">';
  for (var i = 0; i < tags.level1.length; i++) {
    h += '<span class="tag-chip">' + escapeHtml(tags.level1[i]) +
      '<span class="tag-chip-delete" data-type="level1" data-i="' + i + '">\u2715</span></span>';
  }
  h += '<span class="tag-add-btn" data-action="add-tag" data-type="level1">\u2295 新建</span>';
  h += '</div></div>';

  // 二级标签（角色名，只读）
  h += '<div class="tag-section"><div class="tag-section-title">二级标签（角色名·自动同步）</div>';
  h += '<div class="tag-list">';
  if (tags.level2.length === 0) {
    h += '<span style="color:var(--text-secondary); font-size:14px;">暂无角色</span>';
  }
  for (var j = 0; j < appData.classes.length; j++) {
    var cls = appData.classes[j];
    for (var k = 0; k < cls.characters.length; k++) {
      if (cls.characters[k].name) {
        h += '<span class="tag-chip tag-chip-auto">' + escapeHtml(cls.characters[k].name) + '</span>';
      }
    }
  }
  h += '</div></div>';

  // 三级标签（自定义）
  h += '<div class="tag-section"><div class="tag-section-title">三级标签</div>';
  h += '<div class="tag-list">';
  for (var m = 0; m < tags.level3.length; m++) {
    h += '<span class="tag-chip">' + escapeHtml(tags.level3[m]) +
      '<span class="tag-chip-delete" data-type="level3" data-i="' + m + '">\u2715</span></span>';
  }
  h += '<span class="tag-add-btn" data-action="add-tag" data-type="level3">\u2295 新建</span>';
  h += '</div></div>';

  h += '</div>';
  page.innerHTML = h;

  // 删除标签
  var delEls = page.querySelectorAll('.tag-chip-delete');
  for (var d = 0; d < delEls.length; d++) {
    delEls[d].addEventListener('click', function() {
      var type = this.dataset.type;
      var idx = parseInt(this.dataset.i);
      var tag = appData.tags[type][idx];
      showModal({
        message: '删除标签\u300c' + tag + '\u300d？\n已使用此标签的笔记不会被删除，但标签会被移除。',
        buttons: [{ text: '取消' }, { text: '删除', danger: true }]
      }).then(function(r) {
        if (r.index === 1) {
          appData.tags[type].splice(idx, 1);
          for (var n = 0; n < appData.notes.length; n++) {
            if (appData.notes[n].tags) {
              var ti = appData.notes[n].tags.indexOf(tag);
              if (ti >= 0) appData.notes[n].tags.splice(ti, 1);
            }
          }
          saveData();
          renderTagManager();
          showToast('已删除');
        }
      });
    });
  }

  // 添加标签
  var addEls = page.querySelectorAll('[data-action="add-tag"]');
  for (var a = 0; a < addEls.length; a++) {
    addEls[a].addEventListener('click', function() {
      var type = this.dataset.type;
      var label = type === 'level1' ? '一级' : '三级';
      showModal({
        message: '新建' + label + '标签',
        input: true,
        inputValue: '',
        buttons: [{ text: '取消' }, { text: '创建', primary: true }]
      }).then(function(r) {
        if (r.index === 1 && r.value && r.value.trim()) {
          var name = r.value.trim();
          if (appData.tags[type].indexOf(name) >= 0) {
            showToast('标签已存在');
            return;
          }
          appData.tags[type].push(name);
          saveData();
          renderTagManager();
          showToast('已创建');
        }
      });
    });
  }
}
