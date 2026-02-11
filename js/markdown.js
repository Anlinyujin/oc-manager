// ===== Markdown 渲染（增强版） =====

function renderMarkdown(text) {
  if (!text) return '';
  
  var lines = text.split('\n');
  var html = '';
  var inCodeBlock = false;
  var codeContent = '';
  var inList = false;
  var listType = '';
  var inTable = false;
  var tableRows = [];
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    
    // 代码块
    if (line.trim().indexOf('```') === 0) {
      if (inCodeBlock) {
        html += '<pre><code>' + escapeHtml(codeContent.trim()) + '</code></pre>\n';
        codeContent = '';
        inCodeBlock = false;
      } else {
        if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
        if (inTable) { html += buildTable(tableRows); tableRows = []; inTable = false; }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeContent += line + '\n'; continue; }
    
    // 表格
    if (line.indexOf('|') >= 0 && line.trim().charAt(0) === '|') {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      tableRows.push(line);
      inTable = true;
      var nextLine = (i + 1 < lines.length) ? lines[i + 1] : '';
      var nextNextLine = (i + 2 < lines.length) ? lines[i + 2] : '';
      if (nextLine.trim().charAt(0) === '|' || /^\|[\s\-:|]+\|$/.test(nextLine.trim())) continue;
      if (/^\|[\s\-:|]+\|$/.test(nextLine.trim()) && nextNextLine.trim().charAt(0) === '|') continue;
      html += buildTable(tableRows);
      tableRows = [];
      inTable = false;
      continue;
    }
    if (inTable) {
      html += buildTable(tableRows);
      tableRows = [];
      inTable = false;
    }
    
    // 空行
    if (line.trim() === '') {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      continue;
    }
    
    // 标题
    var headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      var level = headingMatch[1].length;
      html += '<h' + level + '>' + inlineFormat(headingMatch[2]) + '</h' + level + '>\n';
      continue;
    }
    
    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += '<hr>\n';
      continue;
    }
    
    // 引用
    if (line.match(/^>\s?(.*)$/)) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      var quoteContent = line.replace(/^>\s?/, '');
      while (i + 1 < lines.length && lines[i + 1].match(/^>\s?/)) {
        i++;
        quoteContent += '<br>' + lines[i].replace(/^>\s?/, '');
      }
      html += '<blockquote>' + inlineFormat(quoteContent) + '</blockquote>\n';
      continue;
    }
    
    // 无序列表
    if (line.match(/^[\-\*\+]\s+(.+)$/)) {
      var ulContent = line.replace(/^[\-\*\+]\s+/, '');
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += '<li>' + inlineFormat(ulContent) + '</li>\n';
      continue;
    }
    
    // 有序列表
    var olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      var olContent = olMatch[2];
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += '<li>' + inlineFormat(olContent) + '</li>\n';
      continue;
    }
    
    // 普通段落
    if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
    html += '<p>' + inlineFormat(line) + '</p>\n';
  }
  
  if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
  if (inCodeBlock) html += '<pre><code>' + escapeHtml(codeContent.trim()) + '</code></pre>\n';
  if (inTable) html += buildTable(tableRows);
  
  return html;
}

function inlineFormat(text) {
  var s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>\$1</code>');
  s = s.replace(/!$$([^$$]*)\]$([^)]+)$/g, '<img src="$2" alt="$1" style="max-width:100%">');
  s = s.replace(/$$([^$$]+)\]$([^)]+)$/g, '<a href="$2" target="_blank">$1</a>');
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>\$1</em></strong>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>\$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>\$1</em>');
  s = s.replace(/~~(.+?)~~/g, '<del>\$1</del>');
  s = s.replace(/==(.+?)==/g, '<mark>\$1</mark>');
  return s;
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
    .replace(/`([^`]+)`/g, '\$1')
    .replace(/^>\s?/gm, '| ')
    .replace(/^[\-\*\+]\s+/gm, '• ')
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
    ctx.fillStyle = item.color || '#1a1a1a';
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
