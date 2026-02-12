// ===== 歌词占位弹窗 =====

var lyricsBlock = null;
var lyricsConfig = {
  width: 90,
  height: 60,
  color: '#ffffff',
  pinned: false
};

// 颜色选项（低饱和）
var lyricsColors = [
  { color: '#ffffff', label: '白' },
  { color: '#1a1a1a', label: '黑' },
  { color: '#d4d4d4', label: '灰' },
  { color: '#e8d5d5', label: '玫' },
  { color: '#d5dde8', label: '蓝' },
  { color: '#d5e8d9', label: '绿' },
  { color: '#e8e4d5', label: '杏' },
  { color: '#ddd5e8', label: '紫' }
];

function loadLyricsConfig() {
  try {
    var saved = localStorage.getItem('oc_lyrics_config');
    if (saved) {
      var parsed = JSON.parse(saved);
      lyricsConfig.width = parsed.width || 90;
      lyricsConfig.height = parsed.height || 60;
      lyricsConfig.color = parsed.color || '#ffffff';
      lyricsConfig.pinned = !!parsed.pinned;
    }
  } catch(e) {}
}

function saveLyricsConfig() {
  try {
    localStorage.setItem('oc_lyrics_config', JSON.stringify(lyricsConfig));
  } catch(e) {}
}

function createLyricsBlock() {
  if (lyricsBlock) return;
  lyricsBlock = document.createElement('div');
  lyricsBlock.id = 'lyricsBlock';
  lyricsBlock.style.cssText = 'position:fixed;left:50%;z-index:500;pointer-events:none;border-radius:0 0 12px 12px;';
  updateLyricsBlockStyle();
  updateLyricsPosition();
  document.body.appendChild(lyricsBlock);

  // 监听视口变化，输入法弹起时修正位置
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateLyricsPosition);
    window.visualViewport.addEventListener('scroll', updateLyricsPosition);
  }
}

function updateLyricsPosition() {
  if (!lyricsBlock) return;
  if (window.visualViewport) {
    lyricsBlock.style.top = window.visualViewport.offsetTop + 'px';
  } else {
    lyricsBlock.style.top = '0px';
  }
}

function updateLyricsBlockStyle() {
  if (!lyricsBlock) return;
  lyricsBlock.style.width = lyricsConfig.width + 'vw';
  lyricsBlock.style.height = lyricsConfig.height + 'px';
  lyricsBlock.style.background = lyricsConfig.color;
  // 加个微妙的阴影让白色块也能看到边界
  if (lyricsConfig.color === '#ffffff' || lyricsConfig.color === '#fff') {
    lyricsBlock.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
  } else {
    lyricsBlock.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  }
}

function removeLyricsBlock() {
  if (lyricsBlock) {
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateLyricsPosition);
      window.visualViewport.removeEventListener('scroll', updateLyricsPosition);
    }
    lyricsBlock.remove();
    lyricsBlock = null;
  }
}

function openLyricsPanel() {
  // 如果已固定，点击♪就打开调整面板（先取消固定）
  // 创建色块（如果没有）
  createLyricsBlock();

  // 创建调整面板
  var existing = document.getElementById('lyricsPanel');
  if (existing) existing.remove();

  var panel = document.createElement('div');
  panel.id = 'lyricsPanel';
  panel.className = 'lyrics-panel';

  var h = '';

  // 高度滑块
  h += '<div class="lyrics-slider-row">';
  h += '<span class="lyrics-slider-label">高度</span>';
  h += '<input type="range" class="lyrics-slider" id="lyricsHeightSlider" min="20" max="200" value="' + lyricsConfig.height + '">';
  h += '<span class="lyrics-slider-value" id="lyricsHeightValue">' + lyricsConfig.height + '</span>';
  h += '</div>';

  // 宽度滑块
  h += '<div class="lyrics-slider-row">';
  h += '<span class="lyrics-slider-label">宽度</span>';
  h += '<input type="range" class="lyrics-slider" id="lyricsWidthSlider" min="30" max="100" value="' + lyricsConfig.width + '">';
  h += '<span class="lyrics-slider-value" id="lyricsWidthValue">' + lyricsConfig.width + '</span>';
  h += '</div>';

  // 颜色选择
  h += '<div class="lyrics-colors">';
  for (var i = 0; i < lyricsColors.length; i++) {
    var c = lyricsColors[i];
    var selected = (c.color === lyricsConfig.color) ? ' lyrics-color-selected' : '';
    var borderStyle = '';
    if (c.color === '#ffffff' || c.color === '#fff') {
      borderStyle = 'border:2px solid #d4d4d4;';
    } else {
      borderStyle = 'border:2px solid transparent;';
    }
    h += '<div class="lyrics-color-btn' + selected + '" data-color="' + c.color + '" style="background:' + c.color + ';' + borderStyle + '"></div>';
  }
  h += '</div>';

  // 钉子按钮和关闭
  h += '<div class="lyrics-actions">';
  h += '<button class="lyrics-action-btn" id="lyricsPinBtn">📌 固定</button>';
  h += '<button class="lyrics-action-btn lyrics-close-btn" id="lyricsCloseBtn">关闭</button>';
  h += '</div>';

  panel.innerHTML = h;
  document.body.appendChild(panel);

  // 绑定事件
  var heightSlider = document.getElementById('lyricsHeightSlider');
  var widthSlider = document.getElementById('lyricsWidthSlider');
  var heightValue = document.getElementById('lyricsHeightValue');
  var widthValue = document.getElementById('lyricsWidthValue');

  heightSlider.addEventListener('input', function() {
    lyricsConfig.height = parseInt(this.value);
    heightValue.textContent = this.value;
    updateLyricsBlockStyle();
  });

  widthSlider.addEventListener('input', function() {
    lyricsConfig.width = parseInt(this.value);
    widthValue.textContent = this.value;
    updateLyricsBlockStyle();
  });

  // 颜色按钮
  var colorBtns = panel.querySelectorAll('.lyrics-color-btn');
  for (var j = 0; j < colorBtns.length; j++) {
    colorBtns[j].addEventListener('click', function() {
      lyricsConfig.color = this.getAttribute('data-color');
      updateLyricsBlockStyle();
      // 更新选中状态
      var all = panel.querySelectorAll('.lyrics-color-btn');
      for (var k = 0; k < all.length; k++) {
        all[k].classList.remove('lyrics-color-selected');
      }
      this.classList.add('lyrics-color-selected');
    });
  }

  // 固定按钮
  document.getElementById('lyricsPinBtn').addEventListener('click', function() {
    lyricsConfig.pinned = true;
    saveLyricsConfig();
    closeLyricsPanel();
    showToast('已固定');
  });

  // 关闭按钮
  document.getElementById('lyricsCloseBtn').addEventListener('click', function() {
    lyricsConfig.pinned = false;
    saveLyricsConfig();
    closeLyricsPanel();
    removeLyricsBlock();
  });
}

function closeLyricsPanel() {
  var panel = document.getElementById('lyricsPanel');
  if (panel) panel.remove();
}

// 初始化：如果之前固定了，自动显示色块
function initLyrics() {
  loadLyricsConfig();
  if (lyricsConfig.pinned) {
    createLyricsBlock();
  }
}

// 侧边栏♪点击
function onLyricsClick() {
  if (lyricsConfig.pinned) {
    // 已固定状态：取消固定，打开调整面板
    lyricsConfig.pinned = false;
    saveLyricsConfig();
    openLyricsPanel();
  } else {
    // 未固定：打开调整面板
    openLyricsPanel();
  }
}
