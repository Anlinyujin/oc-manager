// ===== Markdown 渲染引擎 =====

// ----- 行内格式 -----
function inlineFormat(text) {
  if (!text) return '';

  // 提取行内代码，防止内部被格式化
  var codeParts = [];
  var s = text.replace(/`([^`]+)`/g, function(m, c) {
    var idx = codeParts.length;
    codeParts.push(c);
    return '%%RAWCODE' + idx + '%%';
  });

  // 提取颜色语法 {color}(text)
  var colorParts = [];
  s = s.replace(/\{(\w+)\}\(([^)]+)\)/g, function(m, color, txt) {
    var idx = colorParts.length;
    colorParts.push({ color: color, text: txt });
    return '%%COLOR' + idx + '%%';
  });

  s = escapeHtml(s);

  // 还原颜色
  for (var ci = 0; ci < colorParts.length; ci++) {
    s = s.replace('%%COLOR' + ci + '%%',
      '<span style="color:' + colorParts[ci].color + '">' + escapeHtml(colorParts[ci].text) + '</span>');
  }

  // 还原行内代码
  for (var ki = 0; ki < codeParts.length; ki++) {
    s = s.replace('%%RAWCODE' + ki + '%%',
      '<code>' + escapeHtml(codeParts[ki]) + '</code>');
  }

  // 图片和链接
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 粗斜体 → 粗体 → 斜体
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 删除线、下划线、高亮
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  s = s.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
  s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');

  return s;
}

// ----- 引用块 -----
function buildBlockquote(lines) {
  var result = '';
  var innerLines = [];

  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^(>+)\s?(.*)/);
    if (!match) continue;
    var level = match[1].length;
    var content = match[2];

    if (level === 1) {
      var hasDeeper = false;
      var deeperLines = [];
      var j = i + 1;
      while (j < lines.length) {
        var dm = lines[j].match(/^(>+)\s?(.*)/);
        if (!dm) break;
        if (dm[1].length > 1) {
          hasDeeper = true;
          deeperLines.push(lines[j].substring(1));
          j++;
        } else {
          break;
        }
      }

      if (hasDeeper) {
        if (content.trim()) innerLines.push(content);
        var innerQuote = buildBlockquote(deeperLines);
        var innerHtml = '';
        for (var k = 0; k < innerLines.length; k++) {
          innerHtml += (innerHtml ? '<br>' : '') + inlineFormat(innerLines[k]);
        }
        result += '<blockquote>';
        if (innerHtml) result += '<p>' + innerHtml + '</p>';
        result += innerQuote + '</blockquote>\n';
        innerLines = [];
        i = j - 1;
      } else {
        innerLines.push(content.trim() === '' ? '' : content);
      }
    }
  }

  if (innerLines.length > 0) {
    var paragraphs = [];
    var currentPara = [];
    for (var p = 0; p < innerLines.length; p++) {
      if (innerLines[p] === '') {
        if (currentPara.length > 0) {
          paragraphs.push(currentPara.join('<br>'));
          currentPara = [];
        }
      } else {
        currentPara.push(inlineFormat(innerLines[p]));
      }
    }
    if (currentPara.length > 0) paragraphs.push(currentPara.join('<br>'));
    var html = '';
    for (var q = 0; q < paragraphs.length; q++) {
      html += '<p>' + paragraphs[q] + '</p>';
    }
    result += '<blockquote>' + html + '</blockquote>\n';
  }

  return result;
}

// ----- 列表 -----
function buildNestedList(lines) {
  if (lines.length === 0) return '';
  var items = [];
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
    if (match) {
      items.push({
        indent: match[1].length,
        type: /^\d+\./.test(match[2]) ? 'ol' : 'ul',
        content: match[3]
      });
    }
  }
  if (items.length === 0) return '';

  var indents = [];
  for (var j = 0; j < items.length; j++) {
    if (indents.indexOf(items[j].indent) < 0) indents.push(items[j].indent);
  }
  indents.sort(function(a, b) { return a - b; });
  for (var k = 0; k < items.length; k++) {
    items[k].level = indents.indexOf(items[k].indent);
  }

  return buildListFromItems(items, 0, 0, items.length);
}

function buildListFromItems(items, targetLevel, start, end) {
  var result = '';
  var i = start;

  while (i < end) {
    if (items[i].level < targetLevel) break;
    if (items[i].level === targetLevel) {
      var listType = items[i].type;
      result += '<' + listType + '>';
      while (i < end && items[i].level >= targetLevel) {
        if (items[i].level === targetLevel) {
          result += '<li>' + inlineFormat(items[i].content);
          var childStart = i + 1;
          while (childStart < end && items[childStart].level > targetLevel) childStart++;
          if (childStart > i + 1) {
            result += buildListFromItems(items, targetLevel + 1, i + 1, childStart);
            i = childStart;
          } else {
            i++;
          }
          result += '</li>';
        } else {
          break;
        }
      }
      result += '</' + listType + '>';
    } else {
      i++;
    }
  }

  return result;
}

// ----- 表格 -----
function buildTable(rows) {
  if (rows.length === 0) return '';
  var html = '<table>';
  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].split('|');
    var filtered = [];
    for (var j = 1; j < cells.length - 1; j++) filtered.push(cells[j].trim());
    if (filtered.length === 0) continue;
    var tag = i === 0 ? 'th' : 'td';
    html += '<tr>';
    for (var k = 0; k < filtered.length; k++) {
      html += '<' + tag + '>' + inlineFormat(filtered[k]) + '</' + tag + '>';
    }
    html += '</tr>';
  }
  return html + '</table>';
}

// ----- 主渲染函数 -----
function renderMarkdown(text) {
  if (!text) return '';
  var lines = text.split('\n');
  var result = '';
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    // 代码块
    if (line.trim().indexOf('```') === 0) {
      var codeContent = '';
      i++;
      while (i < lines.length && lines[i].trim().indexOf('```') !== 0) {
        codeContent += (codeContent ? '\n' : '') + lines[i];
        i++;
      }
      i++;
      var codeId = 'code_' + Math.random().toString(36).substr(2, 6);
      result += '<pre id="' + codeId + '"><button class="code-copy-btn" onclick="copyCodeBlock(\'' + codeId + '\')">\u590d\u5236</button><code>' + escapeHtml(codeContent) + '</code></pre>\n';
      continue;
    }

    // 折叠块
    if (line.trim().indexOf('>>>') === 0 && line.trim() !== '>>>') {
      var summary = line.trim().substring(3).trim();
      var detailContent = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '<<<') {
        detailContent += (detailContent ? '\n' : '') + lines[i];
        i++;
      }
      i++;
      result += '<details><summary>' + inlineFormat(summary) + '</summary><div>' + renderMarkdown(detailContent) + '</div></details>\n';
      continue;
    }

    // 表格
    if (line.indexOf('|') >= 0 && line.trim().charAt(0) === '|') {
      var tableRows = [];
      while (i < lines.length && lines[i].trim().charAt(0) === '|') {
        if (!/^\|[\s\-:|]+\|$/.test(lines[i].trim())) tableRows.push(lines[i]);
        i++;
      }
      result += buildTable(tableRows);
      continue;
    }

    // 空行
    if (line.trim() === '') { i++; continue; }

    // 标题
    var headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      var level = headingMatch[1].length;
      result += '<h' + level + '>' + inlineFormat(headingMatch[2]) + '</h' + level + '>\n';
      i++; continue;
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      result += '<hr>\n';
      i++; continue;
    }

    // 引用块
    if (line.match(/^>+\s?/)) {
      var quoteLines = [];
      while (i < lines.length && lines[i].match(/^>+\s?/)) {
        quoteLines.push(lines[i]);
        i++;
      }
      result += buildBlockquote(quoteLines);
      continue;
    }

    // 列表
    if (line.match(/^(\s*)([-*+]|\d+\.)\s+/)) {
      var listLines = [];
      while (i < lines.length && (lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/) || (lines[i].match(/^\s+/) && listLines.length > 0 && lines[i].trim() !== ''))) {
        listLines.push(lines[i]);
        i++;
      }
      result += buildNestedList(listLines);
      continue;
    }

    // 普通段落
    result += '<p>' + inlineFormat(line) + '</p>\n';
    i++;
  }

  return result;
}

// ----- 代码块复制 -----
function copyCodeBlock(id) {
  var pre = document.getElementById(id);
  if (!pre) return;
  var code = pre.querySelector('code');
  if (!code) return;
  var text = code.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('\u5df2\u590d\u5236');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('\u5df2\u590d\u5236');
  }
}

// ----- 预览页保存为图片（html2canvas） -----
function savePreviewAsImage(previewEl, title) {
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:0;top:0;width:' + Math.min(window.innerWidth, 420) + 'px;background:#fff;padding:32px 24px;z-index:-1;';

  if (title) {
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:20px;font-weight:700;margin-bottom:12px;color:#1a1a1a;';
    titleEl.textContent = title;
    container.appendChild(titleEl);

    var hr = document.createElement('hr');
    hr.style.cssText = 'border:none;border-top:1px solid #e5e5e5;margin:0 0 16px;';
    container.appendChild(hr);
  }

  var clone = previewEl.cloneNode(true);
  var copyBtns = clone.querySelectorAll('.code-copy-btn');
  for (var i = 0; i < copyBtns.length; i++) {
    copyBtns[i].parentNode.removeChild(copyBtns[i]);
  }
  container.appendChild(clone);
  document.body.appendChild(container);

  setTimeout(function() {
    html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    }).then(function(canvas) {
      document.body.removeChild(container);
      canvas.toBlob(function(blob) {
        if (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = (title || '\u7b14\u8bb0') + '.png';
          a.click();
          URL.revokeObjectURL(a.href);
          showToast('\u56fe\u7247\u5df2\u4fdd\u5b58');
        }
      }, 'image/png');
    }).catch(function() {
      document.body.removeChild(container);
      showToast('\u5bfc\u51fa\u5931\u8d25');
    });
  }, 200);
}
