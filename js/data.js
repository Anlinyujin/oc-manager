// ===== 数据管理 =====

const STORAGE_KEY = 'oc_manager_data';
let appData = {
  classes: [],
  notes: [],
  tags: { cp: [], custom: [] }
};
let autoSaveTimer = null;

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const d = JSON.parse(s);
      appData.classes = d.classes || [];
      appData.notes = d.notes || [];
      appData.tags = d.tags || { cp: [], custom: [] };
      if (!appData.tags.cp) appData.tags.cp = [];
      if (!appData.tags.custom) appData.tags.custom = [];
    }
  } catch(e) {}
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    showSaveIndicator();
  } catch(e) {}
}

function triggerAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveData, 2000);
}

function createCharacter() {
  return {
    id: generateId(), name: '', gender: '', age: '',
    className: '', position: '', seat: '',
    appearance: { hairstyle: '', eyeColor: '', height: '', features: '', outfit: '', other: '' },
    background: '', relatedInfo: [],
    relationships: { overview: '', entries: [] }
  };
}

function createClass(name) {
  return { id: generateId(), name: name || '未命名班级', collapsed: false, characters: [] };
}

function createNote() {
  return { id: generateId(), title: '', content: '', tags: [], createdAt: Date.now() };
}

function findCharacter(id) {
  for (const c of appData.classes)
    for (const ch of c.characters)
      if (ch.id === id) return ch;
  return null;
}

function findCharLocation(id) {
  for (let i = 0; i < appData.classes.length; i++)
    for (let j = 0; j < appData.classes[i].characters.length; j++)
      if (appData.classes[i].characters[j].id === id) return { ci: i, chi: j };
  return null;
}

function findNote(id) {
  return appData.notes.find(n => n.id === id) || null;
}

function getAllCharacterNames() {
  const names = [];
  appData.classes.forEach(c => {
    c.characters.forEach(ch => {
      if (ch.name) names.push(ch.name);
    });
  });
  return names;
}

function getAllTags() {
  return {
    characters: getAllCharacterNames(),
    cp: appData.tags.cp || [],
    custom: appData.tags.custom || []
  };
}

function exportBackup() {
  saveData();
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'oc_backup.json';
  a.click();
  showToast('备份已下载');
}

function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.classes) { reject('格式不正确'); return; }
        resolve(imported);
      } catch(e) { reject('格式错误'); }
    };
    reader.readAsText(file);
  });
}
