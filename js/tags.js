// ===== 标签管理 =====

function renderTagManager() {
  const page = document.getElementById('pageTagManager');
  const tags = getAllTags();

  let h = '<div class="page-content">';
  h += '<div class="edit-topbar"><button class="back-btn" data-action="tag-back">← 返回</button></div>';

  // 角色标签（自动同步，只读）
  h += '<div class="tag-section"><div class="tag-section-title">角色（自动同步）</div>';
  h += '<div class="tag-list">';
  if (tags.characters.length === 0) {
    h += '<span style="color:var(--text-secondary); font-size:14px;">暂无角色</span>';
  }
  appData.classes.forEach(cls => {
    cls.characters.forEach(ch => {
      if (ch.name) {
        h += `<span class="tag-chip tag-chip-auto">${escapeHtml(ch.name)}</span>`;
      }
    });
  });
  h += '</div></div>';

  // CP标签
  h += '<div class="tag-section"><div class="tag-section-title">CP</div>';
  h += '<div class="tag-list">';
  (appData.tags.cp || []).forEach((tag, i) => {
    h += `<span class="tag-chip">${escapeHtml(tag)}<span class="tag-chip-delete" data-type="cp" data-i="${i}">✕</span></span>`;
  });
  h += '<span class="tag-add-btn" data-action="add-tag" data-type="cp">⊕ 新建</span>';
  h += '</div></div>';

  // 自定义标签
  h += '<div class="tag-section"><div class="tag-section-title">其他</div>';
  h += '<div class="tag-list">';
  (appData.tags.custom || []).forEach((tag, i) => {
    h += `<span class="tag-chip">${escapeHtml(tag)}<span class="tag-chip-delete" data-type="custom" data-i="${i}">✕</span></span>`;
  });
  h += '<span class="tag-add-btn" data-action="add-tag" data-type="custom">⊕ 新建</span>';
  h += '</div></div>';

  h += '</div>';
  page.innerHTML = h;

  // 返回
  page.querySelector('[data-action="tag-back"]').addEventListener('click', () => navigateTo('home'));

  // 删除标签
  page.querySelectorAll('.tag-chip-delete').forEach(el => {
    el.addEventListener('click', async () => {
      const type = el.dataset.type;
      const i = parseInt(el.dataset.i);
      const tag = appData.tags[type][i];
      const r = await showModal({
        message: `删除标签「${tag}」？\n已使用此标签的笔记不会被删除，但标签会被移除。`,
        buttons: [{ text: '取消' }, { text: '删除', danger: true }]
      });
      if (r.index === 1) {
        appData.tags[type].splice(i, 1);
        // 从所有笔记中移除该标签
        appData.notes.forEach(n => {
          if (n.tags) {
            const idx = n.tags.indexOf(tag);
            if (idx >= 0) n.tags.splice(idx, 1);
          }
        });
        saveData();
        renderTagManager();
        showToast('已删除');
      }
    });
  });

  // 添加标签
  page.querySelectorAll('[data-action="add-tag"]').forEach(el => {
    el.addEventListener('click', async () => {
      const type = el.dataset.type;
      const label = type === 'cp' ? 'CP' : '自定义';
      const r = await showModal({
        message: `新建${label}标签`,
        input: true,
        inputValue: '',
        buttons: [{ text: '取消' }, { text: '创建', primary: true }]
      });
      if (r.index === 1 && r.value?.trim()) {
        const name = r.value.trim();
        if (appData.tags[type].includes(name)) {
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
