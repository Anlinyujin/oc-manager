// ===== 主应用逻辑 =====

let currentPage = 'home';
let currentPageData = null;

// ===== 导航 =====
function navigateTo(page, data) {
  // 清理之前的状态
  const topbar = document.getElementById('topbar');
  const main = document.getElementById('mainContent');
  const rightBtn = document.getElementById('topbarRightBtn');
  topbar.classList.remove('note-edit-topbar');
  main.classList.remove('note-edit-main');
  rightBtn.classList.add('hidden');
  rightBtn.onclick = null;

  // 退出导出模式
  if (page !== currentPage) {
    if (charExportMode && page !== 'charPreview') {
      charExportMode = false;
      charExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
    }
    if (noteExportMode) {
      noteExportMode = false;
      noteExportSelection = [];
      document.getElementById('exportBottomBar').classList.remove('visible');
    }
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const title = document.getElementById('topbarTitle');
  currentPage = page;
  currentPageData = data;

  switch(page) {
    case 'home':
      document.getElementById('pageHome').classList.add('active');
      title.textContent = ''; title.classList.remove('visible');
      break;
    case 'charList':
      document.getElementById('pageCharList').classList.add('active');
      title.textContent = '人设卡'; title.classList.add('visible');
      renderCharList();
      break;
    case 'charEdit':
      document.getElementById('pageCharEdit').classList.add('active');
      title.textContent = '编辑'; title.classList.add('visible');
      renderCharEdit(data);
      break;
    case 'charPreview':
      document.getElementById('pageCharPreview').classList.add('active');
      title.textContent = '导出预览'; title.classList.add('visible');
      renderCharPreview(data);
      break;
    case 'noteList':
      document.getElementById('pageNoteList').classList.add('active');
      title.textContent = '笔记'; title.classList.add('visible');
      renderNoteList();
      break;
    case 'noteEdit':
      document.getElementById('pageNoteEdit').classList.add('active');
      title.textContent = ''; title.classList.remove('visible');
      noteEditPreview = false;
      renderNoteEdit(data);
      break;
    case 'tagManager':
      document.getElementById('pageTagManager').classList.add('active');
      title.textContent = '标签管理'; title.classList.add('visible');
      renderTagManager();
      break;
  }
  window.scrollTo(0, 0);
}

// ===== 返回逻辑 =====
function goBack() {
  if (charExportMode) {
    charExportMode = false;
    charExportSelection = [];
    document.getElementById('exportBottomBar').classList.remove('visible');
    renderCharList();
    return;
  }
  if (noteExportMode) {
    noteExportMode = false;
    noteExportSelection = [];
    document.getElementById('exportBottomBar').classList.remove('visible');
    renderNoteList();
    return;
  }
  switch(currentPage) {
    case 'charEdit': navigateTo('charList'); break;
    case 'charPreview': navigateTo('charList'); break;
    case 'charList': navigateTo('home'); break;
    case 'noteEdit': navigateTo('noteList'); break;
    case 'noteList': navigateTo('home'); break;
    case 'tagManager': navigateTo('home'); break;
    case 'home': break;
  }
}

// ===== 侧边栏 =====
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() { sidebar.classList.add('active'); sidebarOverlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); }

menuBtn.addEventListener('click', () => sidebar.classList.contains('active') ? closeSidebar() : openSidebar());
sidebarOverlay.addEventListener('click', closeSidebar);

document.getElementById('sidebarHome').addEventListener('click', () => { closeSidebar(); navigateTo('home'); });
document.getElementById('navCharCards').addEventListener('click', () => { closeSidebar(); navigateTo('charList'); });
document.getElementById('navNotes').addEventListener('click', () => { closeSidebar(); navigateTo('noteList'); });
document.getElementById('navTags').addEventListener('click', () => { closeSidebar(); navigateTo('tagManager'); });
document.getElementById('navBackup').addEventListener('click', () => { closeSidebar(); exportBackup(); });
document.getElementById('navRestore').addEventListener('click', () => { closeSidebar(); document.getElementById('fileInput').click(); });

// 文件导入
document.getElementById('fileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = await importBackup(file);
    const totalChars = imported.classes.reduce((sum, c) => sum + c.characters.length, 0);
    const totalNotes = (imported.notes || []).length;
    const r = await showModal({
      message: `发现 ${imported.classes.length} 个班级，${totalChars} 个角色，${totalNotes} 条笔记。`,
      buttons: [{ text: '取消' }, { text: '合并', primary: true }, { text: '覆盖', danger: true }]
    });
    if (r.index === 0) return;
    if (r.index === 2) {
      appData = imported;
      if (!appData.notes) appData.notes = [];
      if (!appData.tags) appData.tags = { cp: [], custom: [] };
    } else {
      // 合并
      const existingNames = appData.classes.map(c => c.name);
      (imported.classes || []).forEach(ic => {
        let name = ic.name, counter = 2;
        while (existingNames.includes(name)) { name = `${ic.name}(${counter})`; counter++; }
        ic.name = name; existingNames.push(name);
        if (!ic.id) ic.id = generateId();
        ic.characters.forEach(ch => { if (!ch.id) ch.id = generateId(); });
        appData.classes.push(ic);
      });
      (imported.notes || []).forEach(n => { if (!n.id) n.id = generateId(); appData.notes.push(n); });
      if (imported.tags) {
        (imported.tags.cp || []).forEach(t => { if (!appData.tags.cp.includes(t)) appData.tags.cp.push(t); });
        (imported.tags.custom || []).forEach(t => { if (!appData.tags.custom.includes(t)) appData.tags.custom.push(t); });
      }
    }
    saveData();
    if (currentPage === 'charList') renderCharList();
    else if (currentPage === 'noteList') renderNoteList();
    showToast('恢复成功');
  } catch(err) { showToast('恢复失败：' + err); }
  e.target.value = '';
});

// ===== 导出确认按钮 =====
document.getElementById('exportConfirmBtn').addEventListener('click', () => {
  if (currentPage === 'charList' || charExportMode) {
    if (charExportSelection.length === 0) { showToast('请至少选择一个角色'); return; }
    const xml = generateExportXML(charExportSelection, appData.compactExport);
    charExportMode = false;
    charExportSelection = [];
    document.getElementById('exportBottomBar').classList.remove('visible');
    navigateTo('charPreview', xml);
  } else if (currentPage === 'noteList' || noteExportMode) {
    showNoteExportOptions();
  }
});

// ===== 历史记录守卫 =====
function initHistoryGuard() {
  for (let i = 0; i < 20; i++) {
    history.pushState({ guard: true, index: i }, '');
  }
  window.addEventListener('popstate', () => {
    history.pushState({ guard: true }, '');
    goBack();
  });
}

// ===== 初始化 =====
loadData();
navigateTo('home');
initHistoryGuard();
