// ===== Markdown 渲染 (增强版 v2) =====

function renderMarkdown(text) {
  if (!text) return '';
  
  var lines = text.split('\n');
  var html = '';
  var stack = []; // 状态栈: {type: 'ul'|'ol'|'quote', level: int}
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimLine = line.trim();
    
    // 1. 代码块处理 (最高优先级)
    if (trimLine.startsWith('```')) {
      // 关闭所有列表和引用
      while(stack.length > 0) {
        var top = stack.pop();
        html += closeTag(top.type);
      }
      
      var codeContent = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      html += '<pre><code>' + escapeHtml(codeContent) + '</code><div class="code-copy-btn" onclick="copyCode(this)">复制</div></pre>\n';
      continue;
    }
    
    // 2. 折叠块处理 (>>>)
    if (trimLine.startsWith('>>>')) {
      while(stack.length > 0) { html += closeTag(stack.pop().type); }
      var title = trimLine.substring(3).trim() || '详情';
      html += '<details><summary>' + escapeHtml(title) + '</summary>\n';
      continue;
    }
    if (trimLine.startsWith('<<<')) {
      while(stack.length > 0) { html += closeTag(stack.pop().type); }
      html += '</details>\n';
      continue;
    }
    
    // 3. 表格处理
    if (trimLine.startsWith('|') && trimLine.endsWith('|')) {
      while(stack.length > 0) { html += closeTag(stack.pop().type); }
      var tableRows = [line];
      // 向下预读
      while (i + 1 < lines.length && lines[i+1].trim().startsWith('|')) {
        i++;
        tableRows.push(lines[i]);
      }
      html += buildTable(tableRows);
      continue;
    }
    
    // 4. 分割线
    if (/^(\-{3,}|\*{3,})$/.test(trimLine)) {
      while(stack.length > 0) { html += closeTag(stack.pop().type); }
      html += '<hr>\n';
      continue;
    }
    
    // 5. 标题
    var headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      while(stack.length > 0) { html += closeTag(stack.pop().type); }
      var level = headerMatch[1].length;
      html += '<h' + level + '>' + inlineFormat(headerMatch[2]) + '</h' + level + '>\n';
      continue;
    }
    
    // 6. 列表和引用 (核心嵌套逻辑)
    var currentLevel = 0;
    var currentType = null; // 'ul', 'ol', 'quote'
    var content = line;
    
    // 检测缩进和前缀
    var indentMatch = line.match(/^(\s*)(.*)/);
    var spaces = indentMatch[1].length;
    var rest = indentMatch[2];
    
    // 引用 (>)
    if (rest.startsWith('>')) {
      // 计算 > 的数量作为层级
      var quoteMatch = rest.match(/^>+\s?(.*)/);
      if (quoteMatch) {
        // 多级引用 >>>
        var qCount = rest.match(/^>+/)[0].length;
        currentLevel = qCount;
        currentType = 'quote';
        content = quoteMatch[1];
      }
    } 
    // 无序列表 (-, *)
    else if (/^[\-\*]\s/.test(rest)) {
      currentLevel = Math.floor(spaces / 2) + 1; // 2空格一级
      currentType = 'ul';
      content = rest.substring(2);
    }
    // 有序列表 (1.)
    else if (/^\d+\.\s/.test(rest)) {
      currentLevel = Math.floor(spaces / 2) + 1;
      currentType = 'ol';
      content = rest.replace(/^\d+\.\s/, '');
    }
    
    // 状态栈调整
    if (currentType) {
      // 如果当前行是列表/引用
      
      // 1. 如果栈顶类型不同，或者层级更深，需要调整
      while (stack.length > 0) {
        var top = stack[stack.length - 1];
        if (top.type !== currentType) {
          // 类型变了，关闭旧的
          html += closeTag(stack.pop().type);
        } else if (top.level > currentLevel) {
          // 层级变浅了，关闭深层
          html += closeTag(stack.pop().type);
        } else {
          break;
        }
      }
      
      // 2. 如果层级更深，开启新标签
      var lastLevel = stack.length > 0 ? stack[stack.length-1].level : 0;
      if (currentLevel > lastLevel) {
        for (var l = lastLevel; l < currentLevel; l++) {
          html += openTag(currentType);
          stack.push({type: currentType, level: l + 1});
        }
      }
      
      // 3. 输出内容
      if (currentType === 'quote') {
        // 引用内允许换行，不包p标签，直接追加文本
        if (content.trim() === '') html += '<br>';
        else html += inlineFormat(content) + '<br>';
      } else {
        html += '<li>' + inlineFormat(content) + '</li>\n';
      }
      
    } else {
      // 普通文本行
      if (trimLine === '') {
        // 空行，关闭所有列表，保留引用？
        // 简单策略：空行打断列表，不打断引用(除非双空行，这里简化处理)
        while(stack.length > 0 && stack[stack.length-1].type !== 'quote') {
          html += closeTag(stack.pop().type);
        }
        if (stack.length === 0) html += '<br>\n';
      } else {
        // 如果在引用中
        if (stack.length > 0 && stack[stack.length-1].type === 'quote') {
           html += inlineFormat(trimLine) + '<br>';
        } else {
           // 纯文本，关闭所有列表
           while(stack.length > 0) { html += closeTag(stack.pop().type); }
           html += '<p>' + inlineFormat(trimLine) + '</p>\n';
        }
      }
    }
  }
  
  // 结束，关闭所有
  while(stack.length > 0) { html += closeTag(stack.pop().type); }
  
  return html;
}

function openTag(type) {
  if (type === 'ul') return '<ul>\n';
  if (type === 'ol') return '<ol>\n';
  if (type === 'quote') return '<blockquote>\n';
  return '';
}

function closeTag(type) {
  if (type === 'ul') return '</ul>\n';
  if (type === 'ol') return '</ol>\n';
  if (type === 'quote') return '</blockquote>\n';
  return '';
}

function inlineFormat(text) {
  var s = escapeHtml(text);
  // 图片
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');
  // 链接
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // 粗斜体
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // 粗体
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 斜体
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 删除线
  s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // 下划线 ++text++
  s = s.replace(/\+\+(.+?)\+\+/g, '<ins>$1</ins>');
  // 高亮 ==text==
  s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');
  // 行内代码
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 颜色 {red}(text)
  s = s.replace(/\{([a-z]+)\}\((.+?)\)/g, function(match, color, content) {
    return '<span class="md-color-' + color + '">' + content + '</span>';
  });
  
  return s;
}

function buildTable(rows) {
  if (rows.length < 2) return '';
  // 检查第二行是否是分隔符
  if (!/^\|?[\s\-\:|]+\|?$/.test(rows[1])) return '';
  
  var html = '<table>';
  // 表头
  var headers = rows[0].split('|').filter(function(c){return c.trim()!==''});
  html += '<tr>';
  headers.forEach(function(h){ html += '<th>' + inlineFormat(h.trim()) + '</th>'; });
  html += '</tr>';
  
  // 内容 (跳过第二行分隔符)
  for (var i = 2; i < rows.length; i++) {
    var cells = rows[i].split('|');
    // 处理首尾可能的空串
    if (rows[i].trim().startsWith('|')) cells.shift();
    if (rows[i].trim().endsWith('|')) cells.pop();
    
    html += '<tr>';
    cells.forEach(function(c){ html += '<td>' + inlineFormat(c?c.trim():'') + '</td>'; });
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

// 全局函数：复制代码
window.copyCode = function(btn) {
  var code = btn.previousElementSibling.textContent;
  navigator.clipboard.writeText(code).then(function() {
    var original = btn.textContent;
    btn.textContent = '已复制';
    setTimeout(function(){ btn.textContent = original; }, 1500);
  });
};
