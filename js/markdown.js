// ===== Markdown 渲染 =====

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
      i++;
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

function inlineFormat(text) {
  if (!text) return '';

  // 先提取行内代码，防止内部被格式化
  var codeParts = [];
  var s = text.replace(/`([^`]+)`/g, function(m, c) {
    var idx = codeParts.length;
    codeParts.push(c);
    return '%%RAWCODE' + idx + '%%';
  });

  // 提取颜色语法 {color}(text)，在 escapeHtml 之前
  var colorParts = [];
  s = s.replace(/\{(\w+)\}\(([^)]+)\)/g, function(m, color, txt) {
    var idx = colorParts.length;
    colorParts.push({ color: color, text: txt });
    return '%%COLOR' + idx + '%%';
  });

  // 转义HTML
  s = escapeHtml(s);

  // 还原颜色占位符
  for (var ci = 0; ci < colorParts.length; ci++) {
    s = s.replace('%%COLOR' + ci + '%%', '<span style="color:' + colorParts[ci].color + '">' + escapeHtml(colorParts[ci].text) + '</span>');
  }

  // 还原行内代码占位符
  for (var ki = 0; ki < codeParts.length; ki++) {
    s = s.replace('%%RAWCODE' + ki + '%%', '<code>' + escapeHtml(codeParts[ki]) + '</code>');
  }

  // 链接和图片
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 粗斜体
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // 粗体
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 斜体
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 删除线
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // 下划线
  s = s.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
  // 高亮
  s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');

  return s;
}

function buildBlockquote(lines) {
  var result = '';
  var innerLines = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var match = line.match(/^(>+)\s?(.*)/);
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
        if (content.trim()) {
          innerLines.push(content);
        }
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
          innerLines.push('');
        } else {
          innerLines.push(content);
        }
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

// ===== 导出图片（HTML渲染方式） =====
function exportNoteAsImage(markdownText, title) {
  // 创建离屏容器
  var container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:' + (window.innerWidth) + 'px;background:#fff;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.8;';
  
  var html = '';
  if (title) {
    html += '<div style="font-size:20px;font-weight:700;margin-bottom:12px;">' + escapeHtml(title) + '</div>';
    html += '<hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">';
  }
  html += '<div class="note-preview-clean">' + renderMarkdown(markdownText) + '</div>';
  container.innerHTML = html;
  document.body.appendChild(container);

  // 用 Canvas 手动绘制
  return new Promise(function(resolve) {
    // 等待渲染
    setTimeout(function() {
      var scale = 2;
      var w = container.offsetWidth;
      var h = container.offsetHeight;
      var canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      var ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // 使用 SVG foreignObject 方式渲染 HTML 到 Canvas
      var svgData = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
        '<foreignObject width="100%" height="100%">' +
        '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.8;padding:32px 24px;">' +
        getStyledHtml(title, markdownText) +
        '</div></foreignObject></svg>';

      var img = new Image();
      var svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(svgBlob);

      img.onload = function() {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        document.body.removeChild(container);

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
      };

      img.onerror = function() {
        // SVG方式失败，回退到纯文本Canvas方式
        URL.revokeObjectURL(url);
        document.body.removeChild(container);
        exportNoteAsImageFallback(markdownText, title).then(resolve);
      };

      img.src = url;
    }, 100);
  });
}

function getStyledHtml(title, markdownText) {
  var html = '';
  if (title) {
    html += '<div style="font-size:20px;font-weight:700;margin-bottom:12px;">' + escapeHtml(title) + '</div>';
    html += '<hr style="border:none;border-top:1px solid #e5e5e5;margin:12px 0;">';
  }

  // 内联所有样式的 markdown 渲染
  var rendered = renderMarkdown(markdownText);

  // 替换标签添加内联样式
  rendered = rendered.replace(/<h1>/g, '<div style="font-size:20px;font-weight:700;margin:14px 0 6px;">');
  rendered = rendered.replace(/<\/h1>/g, '</div>');
  rendered = rendered.replace(/<h2>/g, '<div style="font-size:17px;font-weight:700;margin:12px 0 5px;">');
  rendered = rendered.replace(/<\/h2>/g, '</div>');
  rendered = rendered.replace(/<h3>/g, '<div style="font-size:15px;font-weight:700;margin:10px 0 4px;">');
  rendered = rendered.replace(/<\/h3>/g, '</div>');
  rendered = rendered.replace(/<h4>/g, '<div style="font-size:14px;font-weight:700;margin:8px 0 3px;">');
  rendered = rendered.replace(/<\/h4>/g, '</div>');
  rendered = rendered.replace(/<p>/g, '<div style="margin:6px 0;">');
  rendered = rendered.replace(/<\/p>/g, '</div>');
  rendered = rendered.replace(/<strong>/g, '<span style="font-weight:700;">');
  rendered = rendered.replace(/<\/strong>/g, '</span>');
  rendered = rendered.replace(/<em>/g, '<span style="font-style:italic;">');
  rendered = rendered.replace(/<\/em>/g, '</span>');
  rendered = rendered.replace(/<del>/g, '<span style="text-decoration:line-through;color:#888;">');
  rendered = rendered.replace(/<\/del>/g, '</span>');
  rendered = rendered.replace(/<u>/g, '<span style="text-decoration:underline;">');
  rendered = rendered.replace(/<\/u>/g, '</span>');
  rendered = rendered.replace(/<mark>/g, '<span style="background:#fff3b0;padding:1px 3px;">');
  rendered = rendered.replace(/<\/mark>/g, '</span>');
  rendered = rendered.replace(/<code>/g, '<span style="background:#f5f5f5;padding:1px 5px;border-radius:3px;font-size:13px;font-family:monospace;">');
  rendered = rendered.replace(/<\/code>/g, '</span>');
  rendered = rendered.replace(/<pre[^>]*>/g, '<div style="background:#f5f5f5;padding:10px;border-radius:6px;margin:6px 0;font-family:monospace;font-size:13px;white-space:pre-wrap;">');
  rendered = rendered.replace(/<\/pre>/g, '</div>');
  rendered = rendered.replace(/<blockquote>/g, '<div style="border-left:3px solid #e5e5e5;padding:4px 0 4px 12px;color:#888;margin:6px 0;">');
  rendered = rendered.replace(/<\/blockquote>/g, '</div>');
  rendered = rendered.replace(/<hr>/g, '<hr style="border:none;border-top:1px solid #e5e5e5;margin:14px 0;">');
  rendered = rendered.replace(/<table>/g, '<table style="border-collapse:collapse;width:100%;margin:6px 0;font-size:13px;">');
  rendered = rendered.replace(/<th>/g, '<th style="border:1px solid #e5e5e5;padding:6px 10px;background:#f5f5f5;font-weight:600;text-align:left;">');
  rendered = rendered.replace(/<td>/g, '<td style="border:1px solid #e5e5e5;padding:6px 10px;text-align:left;">');
  rendered = rendered.replace(/<details>/g, '<div style="border:1px solid #e5e5e5;border-radius:6px;margin:6px 0;overflow:hidden;">');
  rendered = rendered.replace(/<\/details>/g, '</div>');
  rendered = rendered.replace(/<summary>/g, '<div style="padding:8px 12px;font-weight:600;background:#f5f5f5;">▶ ');
  rendered = rendered.replace(/<\/summary>/g, '</div>');
  rendered = rendered.replace(/<ul>/g, '<div style="padding-left:20px;margin:6px 0;">');
  rendered = rendered.replace(/<\/ul>/g, '</div>');
  rendered = rendered.replace(/<ol>/g, '<div style="padding-left:20px;margin:6px 0;">');
  rendered = rendered.replace(/<\/ol>/g, '</div>');
  rendered = rendered.replace(/<li>/g, '<div style="margin:3px 0;">• ');
  rendered = rendered.replace(/<\/li>/g, '</div>');

  // 移除复制按钮
  rendered = rendered.replace(/<button[^>]*class="code-copy-btn"[^>]*>[^<]*<\/button>/g, '');

  html += rendered;
  return html;
}

// 纯文本回退方案
function exportNoteAsImageFallback(markdownText, title) {
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
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\+\+(.+?)\+\+/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/\{(\w+)\}\(([^)]+)\)/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '| ')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^(\d+)\.\s+/gm, '$1. ')
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
