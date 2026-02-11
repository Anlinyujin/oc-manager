// ===== Markdown 渲染 =====

function renderMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 引用
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // 分割线
  html = html.replace(/^---$/gm, '<hr>');

  // 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // 段落
  const lines = html.split('\n');
  let result = '';
  let inBlock = false;
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
