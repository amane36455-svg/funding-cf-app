export function documentHtml(args: { title: string; markdown: string }): string {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <style>
    body {
      font-family: "Yu Gothic", "Hiragino Sans", Meiryo, sans-serif;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.75;
      margin: 0;
    }
    h1 { font-size: 22px; margin: 0 0 18px; }
    h2 { font-size: 16px; margin: 22px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    h3 { font-size: 13px; margin: 16px 0 6px; }
    p { margin: 0 0 8px; }
    ul { margin: 0 0 10px 18px; padding: 0; }
    li { margin: 2px 0; }
    blockquote { border-left: 3px solid #94a3b8; margin: 0 0 14px; padding: 8px 12px; background: #f8fafc; color: #475569; }
    .doc-title { margin-bottom: 20px; color: #334155; }
  </style>
</head>
<body>
  <div class="doc-title">${escapeHtml(args.title)}</div>
  ${markdownToHtml(args.markdown)}
</body>
</html>`;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  let inQuote = false;

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  function closeQuote() {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  }

  for (const line of lines) {
    if (line.startsWith('> ')) {
      closeList();
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${escapeHtml(line.slice(2))}</p>`);
      continue;
    }
    closeQuote();

    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      closeList();
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  closeList();
  closeQuote();
  return html.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
