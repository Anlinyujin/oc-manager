// ===== 主应用逻辑 =====

var currentPage = 'home';
var currentPageData = null;

function navigateTo(page, data) {
  // 恢复topbar（从特殊页面离开时）
  var topbar = document.getElementById('topbar');
  var main = document.getElementById('mainContent');
  topbar.style.display = '';
  main.style.paddingTop = '';
  topbar.classList.remove('note-edit-topbar');
  main.classList.remove('note-edit-main');

  var rightBtn = document.getElementById('topbarRightBtn');
  rightBtn.classList.add('hidden');
  rightBtn.onclick = null;

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

  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var title = document.getElementById('topbarTitle');
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
      // 隐藏主topbar，和笔记编辑页一样
      topbar.style.display = 'none';
      main.style.paddingTop = '0';
      title.textContent = ''; title.classList.remove('visible');
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
      // 隐藏主topbar
      topbar.style.display = 'none';
      main.style.paddingTop = '0';
      title.textContent = ''; title.classList.remove('visible');
      noteEditPreview = false;
      renderNoteEdit(data);
      break;
    case 'tagManager':
      document.getElementById('pageTagManager').classList.add('active');
      title.textContent = '标签管理'; title.classList.add('visible');
      renderTagManager();
      break;
    case 'settings':
      document.getElementById('pageSettings').classList.add('active');
      title.textContent = '设置'; title.classList.add('visible');
      renderSettings();
      break;
  }
  window.scrollTo(0, 0);
}

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
    case 'settings': navigateTo('home'); break;
    case 'home': break;
  }
}

// ===== 侧边栏逻辑 (已修复) =====
var menuBtn = document.getElementById('menuBtn');
var sidebar = document.getElementById('sidebar');
var sidebarOverlay = document.getElementById('sidebarOverlay');

// 判断是否为PC端 (宽屏)
function isPC() { return window.innerWidth >= 768; }

function openSidebar() { 
  sidebar.classList.add('active'); 
  sidebarOverlay.classList.add('active'); 
}

function closeSidebar() { 
  // 只有在非PC端（手机端）才真正关闭侧边栏
  if (!isPC()) { 
    sidebar.classList.remove('active'); 
    sidebarOverlay.classList.remove('active'); 
  } 
}

menuBtn.addEventListener('click', function() { 
  sidebar.classList.contains('active') ? closeSidebar() : openSidebar(); 
});

sidebarOverlay.addEventListener('click', closeSidebar);

document.getElementById('sidebarLyrics').addEventListener('click', function() { closeSidebar(); onLyricsClick(); });
document.getElementById('navCharCards').addEventListener('click', function() { closeSidebar(); navigateTo('charList'); });
document.getElementById('navNotes').addEventListener('click', function() { closeSidebar(); navigateTo('noteList'); });
document.getElementById('navTags').addEventListener('click', function() { closeSidebar(); navigateTo('tagManager'); });
document.getElementById('navSettings').addEventListener('click', function() { closeSidebar(); navigateTo('settings'); });
document.getElementById('navBackup').addEventListener('click', function() { closeSidebar(); exportBackup(); });
document.getElementById('navRestore').addEventListener('click', function() { closeSidebar(); document.getElementById('fileInput').click(); });

document.getElementById('fileInput').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  importBackup(file).then(function(imported) {
    var totalChars = imported.classes.reduce(function(sum, c) { return sum + c.characters.length; }, 0);
    var totalNotes = (imported.notes || []).length;
    return showModal({
      message: '发现 ' + imported.classes.length + ' 个班级，' + totalChars + ' 个角色，' + totalNotes + ' 条笔记。',
      buttons: [{ text: '取消' }, { text: '合并', primary: true }, { text: '覆盖', danger: true }]
    }).then(function(r) {
      if (r.index === 0) return;
      if (r.index === 2) {
        appData = imported;
        if (!appData.notes) appData.notes = [];
        if (!appData.tags) appData.tags = { cp: [], custom: [] };
      } else {
        var existingNames = appData.classes.map(function(c) { return c.name; });
        (imported.classes || []).forEach(function(ic) {
          var name = ic.name, counter = 2;
          while (existingNames.indexOf(name) >= 0) { name = ic.name + '(' + counter + ')'; counter++; }
          ic.name = name; existingNames.push(name);
          if (!ic.id) ic.id = generateId();
          ic.characters.forEach(function(ch) { if (!ch.id) ch.id = generateId(); });
          appData.classes.push(ic);
        });
        (imported.notes || []).forEach(function(n) { if (!n.id) n.id = generateId(); appData.notes.push(n); });
        if (imported.tags) {
          (imported.tags.cp || []).forEach(function(t) { if (appData.tags.cp.indexOf(t) < 0) appData.tags.cp.push(t); });
          (imported.tags.custom || []).forEach(function(t) { if (appData.tags.custom.indexOf(t) < 0) appData.tags.custom.push(t); });
        }
      }
      saveData();
      if (currentPage === 'charList') renderCharList();
      else if (currentPage === 'noteList') renderNoteList();
      showToast('恢复成功');
    });
  }).catch(function(err) { showToast('恢复失败：' + err); });
  e.target.value = '';
});

document.getElementById('exportConfirmBtn').addEventListener('click', function() {
  if (currentPage === 'charList' || charExportMode) {
    if (charExportSelection.length === 0) { showToast('请至少选择一个角色'); return; }
    var xml = generateExportXML(charExportSelection, appData.compactExport);
    charExportMode = false;
    charExportSelection = [];
    document.getElementById('exportBottomBar').classList.remove('visible');
    navigateTo('charPreview', xml);
  } else if (currentPage === 'noteList' || noteExportMode) {
    showNoteExportOptions();
  }
});

function initHistoryGuard() {
  for (var i = 0; i < 20; i++) {
    history.pushState({ guard: true, index: i }, '');
  }
  window.addEventListener('popstate', function() {
    history.pushState({ guard: true }, '');
    goBack();
  });
}

// 初始化流程
loadData();
initDarkMode();
navigateTo('home');
initHistoryGuard();
initLyrics();

// PC端初始化时自动展开侧边栏
if (isPC()) { sidebar.classList.add('active'); }
window.addEventListener('resize', function() {
  if (isPC()) { sidebar.classList.add('active'); sidebarOverlay.classList.remove('active'); }
});
