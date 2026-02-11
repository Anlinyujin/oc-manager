// ===== Markdown 渲染（增强版） =====

function renderMarkdown(text) {
  if (!text) return '';
  
  let lines = text.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeContent = '';
  let inList = false;
  let listType = '';
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 代码块
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeContent.trim())}</code></pre>\n`;
        codeContent = '';
        inCodeBlock = false;
      } else {
        if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
        if (inTable) { html += renderTable(tableRows); tableRows = []; inTable = false; }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeContent += line + '\n'; continue; }
    
    // 表格
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      // 跳过分隔行
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      tableRows.push(line);
      inTable = true;
      // 检查下一行是否还是表格
      if (i + 1 >= lines.length || (!lines[i+1].trim().startsWith('|') && !/^\|[\s\-:|]+\|$/.test(lines[i+1]?.trim() || ''))) {
        // 但要检查下下行
        if (i + 2 < lines.length && lines[i+2]?.trim().startsWith('|')) continue;
        if (i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i+1]?.trim() || '')) continue;
        html += renderTable(tableRows);
        tableRows = [];
        inTable = false;
      }
      continue;
    }
    if (inTable) {
      html += renderTable(tableRows);
      tableRows = [];
      inTable = false;
    }
    
    // 空行
    if (line.trim() === '') {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      continue;
    }
    
    // 标题
    let headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      const level = headingMatch[1].length;
      html += `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>\n`;
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
      let quoteContent = line.replace(/^>\s?/, '');
      // 收集连续引用行
      while (i + 1 < lines.length && lines[i+1].match(/^>\s?/)) {
        i++;
        quoteContent += '<br>' + lines[i].replace(/^>\s?/, '');
      }
      html += `<blockquote>${inlineFormat(quoteContent)}</blockquote>\n`;
      continue;
    }
    
    // 无序列表
    if (line.match(/^[\-\*\+]\s+(.+)$/)) {
      const content = line.replace(/^[\-\*\+]\s+/, '');
      if (!inList || listType !== 'ul') {
        if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${inlineFormat(content)}</li>\n`;
      continue;
    }
    
    // 有序列表
    let olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      const content = olMatch[2];
      if (!inList || listType !== 'ol') {
        if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${inlineFormat(content)}</li>\n`;
      continue;
    }
    
    // 普通段落
    if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
    html += `<p>${inlineFormat(line)}</p>\n`;
  }
  
  // 关闭未关闭的标签
  if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
  if (inCodeBlock) html += `<pre><code>${escapeHtml(codeContent.trim())}</code></pre>\n`;
  if (inTable) html += renderTable(tableRows);
  
  return html;
}

function inlineFormat(text) {
  let s = escapeHtml(text);
  // 行内代码（优先处理，防止内部被其他规则影响）
  s = s.replace(/`([^`]+)`/g, '<code>\$1</code>');
  // 图片（在链接之前）
  s = s.replace(/!$$([^$$]*)\]$([^)]+)$/g, '<img src="$2" alt="$1" style="max-width:100%">');
  // 链接
  s = s.replace(/$$([^$$]+)\]$([^)]+)$/g, '<a href="$2" target="_blank">$1</a>');
  // 粗斜体
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>\$1</em></strong>');
  // 粗体
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>\$1</strong>');
  // 斜体
  s = s.replace(/\*(.+?)\*/g, '<em>\$1</em>');
  // 删除线
  s = s.replace(/~~(.+?)~~/g, '<del>\$1</del>');
  // 高亮
  s = s.replace(/==(.+?)==/g, '<mark>\$1</mark>');
  return s;
}

function renderTable(rows) {
  if (rows.length === 0) return '';
  let html = '<table>';
  rows.forEach((row, i) => {
    const cells = row.split('|').filter((c, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim());
    const tag = i === 0 ? 'th' : 'td';
    html += '<tr>';
    cells.forEach(cell => { html += `<${tag}>${inlineFormat(cell)}</${tag}>`; });
    html += '</tr>';
  });
  html += '</table>';
  return html;
}

// 导出图片（使用canvas绘制纯文本方案）
async function exportNoteAsImage(markdownText, title) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const width = window.innerWidth * 2;
  const padding = 48;
  const fontSize = 28;
  const lineHeight = fontSize * 1.8;
  const titleFontSize = 40;
  const maxTextWidth = width - padding * 2;

  // 先计算需要多高
  ctx.font = `${fontSize}px -apple-system, sans-serif`;
  
  let allLines = [];
  
  if (title) {
    ctx.font = `bold ${titleFontSize}px -apple-system, sans-serif`;
    const titleLines = wrapText(ctx, title, maxTextWidth);
    titleLines.forEach(l => allLines.push({ text: l, bold: true, size: titleFontSize }));
    allLines.push({ text: '', size: fontSize }); // 空行
    allLines.push({ text: '─'.repeat(30), size: fontSize, color: '#e5e5e5' }); // 分割线
    allLines.push({ text: '', size: fontSize }); // 空行
  }
  
  // 简单文本渲染（去掉md标记）
  const plainText = markdownText
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '\$1')
    .replace(/\*\*(.+?)\*\*/g, '\$1')
    .replace(/\*(.+?)\*/g, '\$1')
    .replace(/~~(.+?)~~/g, '\$1')
    .replace(/`([^`]+)`/g, '\$1')
    .replace(/^>\s?/gm, '│ ')
    .replace(/^[\-\*\+]\s+/gm, '• ')
    .replace(/^(\d+)\.\s+/gm, '\$1. ')
    .replace(/^---$/gm, '─'.repeat(30));
  
  ctx.font = `${fontSize}px -apple-system, sans-serif`;
  const textLines = plainText.split('\n');
  textLines.forEach(line => {
    if (line.trim() === '') {
      allLines.push({ text: '', size: fontSize });
    } else {
      const wrapped = wrapText(ctx, line, maxTextWidth);
      wrapped.forEach(l => allLines.push({ text: l, size: fontSize }));
    }
  });
  
  const totalHeight = padding * 2 + allLines.length * lineHeight;
  canvas.width = width;
  canvas.height = Math.max(totalHeight, 200);
  
  // 绘制白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 绘制文字
  let y = padding + fontSize;
  allLines.forEach(line => {
    ctx.fillStyle = line.color || '#1a1a1a';
    ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(line.text, padding, y);
    y += lineHeight;
  });
  
  // 下载
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title || '笔记'}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      resolve();
    }, 'image/png');
  });
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [''];
  const lines = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}
  for (let line of lines) {
    if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<pre') ||
        line.startsWith('<blockquote') || line.startsWith('<hr') || line.startsWith('<li')) {
      result += line + '\n';
      inBlock = true;
    } else if (line.trim() === '') {
      result += '\n';
      inBlock = false;
    } else if (line.startsWith('</')) {
      result += line + '\n';
      inBlock = false;
    } else {
      result += `<p>${line}</p>\n`;
    }
  }

  // 合并相邻blockquote
  result = result.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

  return result;
}

// 导出图片
function exportNoteAsImage(htmlContent, title) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${window.innerWidth}px;
      padding: 24px;
      background: #ffffff;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.8;
    `;
    if (title) {
      const h = document.createElement('h1');
      h.style.cssText = 'font-size: 22px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5;';
      h.textContent = title;
      container.appendChild(h);
    }
    const content = document.createElement('div');
    content.innerHTML = htmlContent;
    content.querySelectorAll('h1').forEach(el => el.style.cssText = 'font-size: 22px; margin: 16px 0 8px;');
    content.querySelectorAll('h2').forEach(el => el.style.cssText = 'font-size: 19px; margin: 14px 0 6px;');
    content.querySelectorAll('h3').forEach(el => el.style.cssText = 'font-size: 17px; margin: 12px 0 4px;');
    content.querySelectorAll('p').forEach(el => el.style.cssText = 'margin: 8px 0;');
    content.querySelectorAll('blockquote').forEach(el => el.style.cssText = 'border-left: 3px solid #e5e5e5; padding-left: 12px; color: #888; margin: 8px 0;');
    content.querySelectorAll('code').forEach(el => el.style.cssText = 'background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 14px;');
    content.querySelectorAll('pre').forEach(el => el.style.cssText = 'background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 8px 0;');
    content.querySelectorAll('hr').forEach(el => el.style.cssText = 'border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;');
    container.appendChild(content);
    document.body.appendChild(container);

    setTimeout(() => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = container.offsetWidth * scale;
      canvas.height = container.offsetHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, container.offsetWidth, container.offsetHeight);

      // 使用SVG foreignObject渲染
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${container.offsetWidth}" height="${container.offsetHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: sans-serif; font-size: 15px; line-height: 1.8; color: #1a1a1a; padding: 24px;">
              ${title ? `<h1 style="font-size: 22px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(title)}</h1>` : ''}
              ${container.querySelector('div').innerHTML}
            </div>
          </foreignObject>
        </svg>
      `;
      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        document.body.removeChild(container);
        canvas.toBlob(blob => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `${title || '笔记'}.png`;
          a.click();
          resolve();
        }, 'image/png');
      };
      img.onerror = () => {
        // fallback: 直接用html2canvas的简单替代
        document.body.removeChild(container);
        showToast('图片导出失败，请使用复制或TXT导出');
        resolve();
      };
      img.src = url;
    }, 100);
  });
}
