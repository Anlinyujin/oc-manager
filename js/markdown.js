// ===== Markdown 渲染（增强版 v2） =====

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
      i++; // skip closing ```
      var codeId = 'code_' + Math.random().toString(36).substr(2, 6);
      result += '<pre id="' + codeId + '"><button class="code-copy-btn" onclick="copyCodeBlock(\'' + codeId + '\')">复制</button><code>' + escapeHtml(codeContent) + '</code></pre>\n';
      continue;
    }

    // 折叠块 >>>title ... <<<
    if (line.trim().indexOf('>>>') === 0 && line.trim() !== '>>>') {
      var summary = line.trim().substring(3).trim();
      var detailContent = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '<<<') {
        detailContent += (detailContent ? '\n' : '') + lines[i];
        i++;
      }
      i++; // skip <<<
      result += '<details><summary>' + inlineFormat(summary) + '</summary><div>' + renderMarkdown(detailContent) + '</div></details>\n';
      continue;
    }

    // 表格
    if (line.indexOf('|') >= 0 && line.trim().charAt(0) === '|') {
      var tableRows = [];
      while (i < lines.length && lines[i].trim().charAt(0) === '|') {
        if (!/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
          tableRows.push(lines[i]);
        }
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

    // 引用块（收集所有连续的引用行）
    if (line.match(/^>+\s?/)) {
      var quoteLines = [];
      while (i < lines.length && lines[i].match(/^>+\s?/)) {
        quoteLines.push(lines[i]);
        i++;
      }
      result += buildBlockquote(quoteLines);
      continue;
    }

    // 列表（无序和有序，支持嵌套）
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

function inlineFormat(text) {
  if (!text) return '';
  var s = escapeHtml(text);
  // 行内代码（先处理，防止内部被格式化）
  var codeParts = [];
  s = s.replace(/`([^`]+)`/g, function(m, c) {
    var idx = codeParts.length;
    codeParts.push('<code>' + c + '</code>');
    return '%%CODE' + idx + '%%';
  });
  // 链接和图片
  s = s.replace(/!$$([^$$]*)\]$([^)]+)$/g, '<img src="$2" alt="$1" style="max-width:100%">');
  s = s.replace(/$$([^$$]+)\]$([^)]+)$/g, '<a href="$2" target="_blank">$1</a>');
  // 粗斜体
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>\$1</em></strong>');
  // 粗体
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>\$1</strong>');
  // 斜体
  s = s.replace(/\*(.+?)\*/g, '<em>\$1</em>');
  // 删除线
  s = s.replace(/~~(.+?)~~/g, '<del>\$1</del>');
  // 下划线
  s = s.replace(/\+\+(.+?)\+\+/g, '<u>\$1</u>');
  // 高亮
  s = s.replace(/==(.+?)==/g, '<mark>\$1</mark>');
  // 文字颜色 {color}(text)
  s = s.replace(/\{(\w+)\}$(.+?)$/g, '<span style="color:$1">$2</span>');
  // 还原行内代码
  for (var i = 0; i < codeParts.length; i++) {
    s = s.replace('%%CODE' + i + '%%', codeParts[i]);
  }
  return s;
}

function buildBlockquote(lines) {
  // 按引用层级分组
  var result = '';
  var currentLevel = 0;
  var innerLines = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var match = line.match(/^(>+)\s?(.*)/);
    if (!match) continue;
    var level = match[1].length;
    var content = match[2];

    if (level === 1) {
      // 检查是否有更深层级
      var hasDeeper = false;
      var deeperLines = [];
      var j = i + 1;
      while (j < lines.length) {
        var dm = lines[j].match(/^(>+)\s?(.*)/);
        if (!dm) break;
        if (dm[1].length > 1) {
          hasDeeper = true;
          deeperLines.push(lines[j].substring(1)); // 去掉一层 >
          j++;
        } else {
          break;
        }
      }

      if (hasDeeper) {
        if (content.trim()) {
          innerLines.push(content);
        }
        // 递归处理内部
        var innerQuote = buildBlockquote(deeperLines);
        var innerHtml = '';
        for (var k = 0; k < innerLines.length; k++) {
          innerHtml += (innerHtml ? '<br>' : '') + inlineFormat(innerLines[k]);
        }
        result += '<blockquote>';
        if (innerHtml) result += '<p>' + innerHtml + '</p>';
        result += innerQuote;
        result += '</blockquote>\n';
        innerLines = [];
        i = j - 1;
      } else {
        if (content.trim() === '') {
          // 空引用行 = 换行
          innerLines.push('');
        } else {
          innerLines.push(content);
        }
      }
    }
  }

  // 处理剩余的行
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
    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join('<br>'));
    }
    var html = '';
    for (var q = 0; q < paragraphs.length; q++) {
      html += '<p>' + paragraphs[q] + '</p>';
    }
    result += '<blockquote>' + html + '</blockquote>\n';
  }

  return result;
}

function buildNestedList(lines) {
  if (lines.length === 0) return '';

  // 解析每行的缩进级别和内容
  var items = [];
  for (var i = 0; i < lines.length; i++) {
    var match = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
    if (match) {
      var indent = match[1].length;
      var marker = match[2];
      var content = match[3];
      var type = /^\d+\./.test(marker) ? 'ol' : 'ul';
      items.push({ indent: indent, type: type, content: content });
    }
  }

  if (items.length === 0) return '';

  // 标准化缩进级别
  var indents = [];
  for (var j = 0; j < items.length; j++) {
    if (indents.indexOf(items[j].indent) < 0) {
      indents.push(items[j].indent);
    }
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
          // 检查子级
          var childStart = i + 1;
          while (childStart < end && items[childStart].level > targetLevel) {
            childStart++;
          }
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

function buildTable(rows) {
  if (rows.length === 0) return '';
  var html = '<table>';
  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].split('|');
    var filtered = [];
    for (var j = 1; j < cells.length - 1; j++) {
      filtered.push(cells[j].trim());
    }
    if (filtered.length === 0) continue;
    var tag = i === 0 ? 'th' : 'td';
    html += '<tr>';
    for (var k = 0; k < filtered.length; k++) {
      html += '<' + tag + '>' + inlineFormat(filtered[k]) + '</' + tag + '>';
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function copyCodeBlock(id) {
  var pre = document.getElementById(id);
  if (!pre) return;
  var code = pre.querySelector('code');
  if (!code) return;
  var text = code.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('已复制');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('已复制');
  }
}

function exportNoteAsImage(markdownText, title) {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var width = window.innerWidth * 2;
  var padding = 48;
  var fontSize = 28;
  var lineHeight = Math.floor(fontSize * 1.8);
  var titleFontSize = 40;
  var maxTextWidth = width - padding * 2;

  ctx.font = fontSize + 'px -apple-system, sans-serif';

  var allLines = [];

  if (title) {
    ctx.font = 'bold ' + titleFontSize + 'px -apple-system, sans-serif';
    var titleLines = wrapText(ctx, title, maxTextWidth);
    for (var t = 0; t < titleLines.length; t++) {
      allLines.push({ text: titleLines[t], bold: true, size: titleFontSize });
    }
    allLines.push({ text: '', size: fontSize });
  }

  var plainText = markdownText
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '\$1')
    .replace(/\*\*(.+?)\*\*/g, '\$1')
    .replace(/\*(.+?)\*/g, '\$1')
    .replace(/~~(.+?)~~/g, '\$1')
    .replace(/\+\+(.+?)\+\+/g, '\$1')
    .replace(/==(.+?)==/g, '\$1')
    .replace(/\{(\w+)\}$(.+?)$/g, '\$2')
    .replace(/`([^`]+)`/g, '\$1')
    .replace(/^>\s?/gm, '| ')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^(\d+)\.\s+/gm, '\$1. ')
    .replace(/^---$/gm, '────────────────');

  ctx.font = fontSize + 'px -apple-system, sans-serif';
  var textLines = plainText.split('\n');
  for (var p = 0; p < textLines.length; p++) {
    if (textLines[p].trim() === '') {
      allLines.push({ text: '', size: fontSize });
    } else {
      var wrapped = wrapText(ctx, textLines[p], maxTextWidth);
      for (var w = 0; w < wrapped.length; w++) {
        allLines.push({ text: wrapped[w], size: fontSize });
      }
    }
  }

  var totalHeight = padding * 2 + allLines.length * lineHeight;
  canvas.width = width;
  canvas.height = Math.max(totalHeight, 200);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var y = padding + fontSize;
  for (var d = 0; d < allLines.length; d++) {
    var item = allLines[d];
    ctx.fillStyle = '#1a1a1a';
    ctx.font = (item.bold ? 'bold ' : '') + item.size + 'px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(item.text, padding, y);
    y += lineHeight;
  }

  return new Promise(function(resolve) {
    canvas.toBlob(function(blob) {
      if (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (title || '笔记') + '.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }
      resolve();
    }, 'image/png');
  });
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [''];
  var lines = [];
  var current = '';
  for (var i = 0; i < text.length; i++) {
    var test = current + text[i];
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = text[i];
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}
