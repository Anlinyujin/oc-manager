// ===== 设置页 =====

function renderSettings() {
  var page = document.getElementById('pageSettings');
  var darkMode = localStorage.getItem('oc_darkMode') === 'true';

  var html = '';
  html += '<div class="settings-list">';

  // 夜间模式
  html += '<div class="settings-item">';
  html += '<span class="settings-label">夜间模式</span>';
  html += '<label class="settings-toggle">';
  html += '<input type="checkbox" id="darkModeToggle"' + (darkMode ? ' checked' : '') + '>';
  html += '<span class="toggle-slider"></span>';
  html += '</label>';
  html += '</div>';

  html += '</div>';
  page.innerHTML = html;

  document.getElementById('darkModeToggle').addEventListener('change', function() {
    var on = this.checked;
    localStorage.setItem('oc_darkMode', on ? 'true' : 'false');
    applyDarkMode(on);
  });
}

function applyDarkMode(on) {
  if (on) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function initDarkMode() {
  var on = localStorage.getItem('oc_darkMode') === 'true';
  applyDarkMode(on);
}
