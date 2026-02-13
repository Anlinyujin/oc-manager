// ===== 歌词占位弹窗 =====

var lyricsBlock = null;
var lyricsConfig = {
  width: 90,
  height: 60,
  color: '#ffffff',
  pinned: false
};

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
  lyricsBlock.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:500;pointer-events:none;border-radius:0 0 12px 12px;transition:none;';
  updateLyricsBlockStyle();
  document.body.appendChild(lyricsBlock);

  if (window.visualViewport) {
    var onViewportChange = function() {
      if (!lyricsBlock) return;
      var offsetTop = window.visualViewport.offsetTop;
      lyricsBlock.style.top = offsetTop + 'px';
    };
    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
    lyricsBlock._vpResize = onViewportChange;
    lyricsBlock._vpScroll = onViewportChange;
  }
}

function updateLyricsBlockStyle() {
  if (!lyricsBlock) return;
  lyricsBlock.style.width = lyricsConfig.width + 'vw';
  lyricsBlock.style.height = lyricsConfig.height + 'px';
  lyricsBlock.style.background = lyricsConfig.color;
  if (lyricsConfig.color === '#ffffff' || lyricsConfig.color === '#fff') {
    lyricsBlock.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
  } else {
    lyricsBlock.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  }
}

function removeLyricsBlock() {
  if (lyricsBlock) {
    if (window.visualViewport && lyricsBlock._vpResize) {
      window.visualViewport.removeEventListener('resize', lyricsBlock._vpResize);
      window.visualViewport.removeEventListener('scroll', lyricsBlock._vpScroll);
    }
    lyricsBlock.remove();
    lyricsBlock = null;
  }
}

function openLyricsPanel() {
  createLyricsBlock();

  var existing = document.getElementById('lyricsPanel');
  if (existing) existing.remove();

  var panel = document.createElement('div');
  panel.id = 'lyricsPanel';
  panel.className = 'lyrics-adjust-panel';

  var h = '';

  h += '<div class="lyrics-slider-row">';
  h += '<span class="lyrics-slider-label">高度</span>';
  h += '<input type="range" class="lyrics-slider" id="lyricsHeightSlider" min="20" max="200" value="' + lyricsConfig.height + '">';
  h += '<span class="lyrics-slider-value" id="lyricsHeightValue">' + lyricsConfig.height + '</span>';
  h += '</div>';

  h += '<div class="lyrics-slider-row">';
  h += '<span class="lyrics-slider-label">宽度</span>';
  h += '<input type="range" class="lyrics-slider" id="lyricsWidthSlider" min="30" max="100" value="' + lyricsConfig.width + '">';
  h += '<span class="lyrics-slider-value" id="lyricsWidthValue">' + lyricsConfig.width + '</span>';
  h += '</div>';

  h += '<div class="lyrics-colors">';
  for (var i = 0; i < lyricsColors.length; i++) {
    var c = lyricsColors[i];
    var selected = (c.color === lyricsConfig.color) ? ' lyrics-color-selected' : '';
    var borderStyle = (c.color === '#ffffff' || c.color === '#fff') ? 'border:2px solid #d4d4d4;' : 'border:2px solid transparent;';
    h += '<div class="lyrics-color-btn' + selected + '" data-color="' + c.color + '" style="background:' + c.color + ';' + borderStyle + '"></div>';
  }
  h += '</div>';

  h += '<div class="lyrics-actions">';
  h += '<button class="lyrics-action-btn" id="lyricsPinBtn">\ud83d\udccc \u56fa\u5b9a</button>';
  h += '<button class="lyrics-action-btn lyrics-close-btn" id="lyricsCloseBtn">\u5173\u95ed</button>';
  h += '</div>';

  panel.innerHTML = h;
  document.body.appendChild(panel);

  document.getElementById('lyricsHeightSlider').addEventListener('input', function() {
    lyricsConfig.height = parseInt(this.value);
    document.getElementById('lyricsHeightValue').textContent = this.value;
    updateLyricsBlockStyle();
  });

  document.getElementById('lyricsWidthSlider').addEventListener('input', function() {
    lyricsConfig.width = parseInt(this.value);
    document.getElementById('lyricsWidthValue').textContent = this.value;
    updateLyricsBlockStyle();
  });

  var colorBtns = panel.querySelectorAll('.lyrics-color-btn');
  for (var j = 0; j < colorBtns.length; j++) {
    colorBtns[j].addEventListener('click', function() {
      lyricsConfig.color = this.getAttribute('data-color');
      updateLyricsBlockStyle();
      var all = panel.querySelectorAll('.lyrics-color-btn');
      for (var k = 0; k < all.length; k++) {
        all[k].classList.remove('lyrics-color-selected');
      }
      this.classList.add('lyrics-color-selected');
    });
  }

  document.getElementById('lyricsPinBtn').addEventListener('click', function() {
    lyricsConfig.pinned = true;
    saveLyricsConfig();
    closeLyricsPanel();
    showToast('\u5df2\u56fa\u5b9a');
  });

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

function initLyrics() {
  loadLyricsConfig();
  if (lyricsConfig.pinned) {
    createLyricsBlock();
  }
}

function onLyricsClick() {
  if (lyricsConfig.pinned) {
    lyricsConfig.pinned = false;
    saveLyricsConfig();
    openLyricsPanel();
  } else {
    openLyricsPanel();
  }
}
