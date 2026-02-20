// ===== 数据管理 =====

var STORAGE_KEY = 'oc_manager_data';
var appData = {
  classes: [],
  notes: [],
  tags: { level1: [], level3: [] }
};
var autoSaveTimer = null;

function loadData() {
  try {
    var s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      var d = JSON.parse(s);
      appData.classes = d.classes || [];
      appData.notes = d.notes || [];
      if (d.tags) {
        if (d.tags.level1) {
          appData.tags.level1 = d.tags.level1;
          appData.tags.level3 = d.tags.level3 || [];
        } else {
          appData.tags.level1 = d.tags.custom || [];
          appData.tags.level3 = d.tags.cp || [];
        }
      }
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
    relationships: { overview: '', entries: [] },
    coreTraits: ''
  };
}

function createClass(name) {
  return { id: generateId(), name: name || '未命名班级', collapsed: false, characters: [] };
}

function createNote() {
  return { id: generateId(), title: '', content: '', tags: [], createdAt: Date.now() };
}

function findCharacter(id) {
  for (var i = 0; i < appData.classes.length; i++) {
    var chars = appData.classes[i].characters;
    for (var j = 0; j < chars.length; j++) {
      if (chars[j].id === id) return chars[j];
    }
  }
  return null;
}

function findCharLocation(id) {
  for (var i = 0; i < appData.classes.length; i++) {
    for (var j = 0; j < appData.classes[i].characters.length; j++) {
      if (appData.classes[i].characters[j].id === id) return { ci: i, chi: j };
    }
  }
  return null;
}

function findNote(id) {
  for (var i = 0; i < appData.notes.length; i++) {
    if (appData.notes[i].id === id) return appData.notes[i];
  }
  return null;
}

function getAllCharacterNames() {
  var names = [];
  for (var i = 0; i < appData.classes.length; i++) {
    var chars = appData.classes[i].characters;
    for (var j = 0; j < chars.length; j++) {
      if (chars[j].name) names.push(chars[j].name);
    }
  }
  return names;
}

function getAllTags() {
  return {
    level1: appData.tags.level1 || [],
    level2: getAllCharacterNames(),
    level3: appData.tags.level3 || []
  };
}

function exportBackup() {
  saveData();
  var blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'oc_backup.json';
  a.click();
  showToast('备份已下载');
}

function importBackup(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(evt) {
      try {
        var imported = JSON.parse(evt.target.result);
        if (!imported.classes) { reject('格式不正确'); return; }
        resolve(imported);
      } catch(e) { reject('格式错误'); }
    };
    reader.readAsText(file);
  });
}
