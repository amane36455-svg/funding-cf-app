import { describe, expect, it } from 'vitest';
import { documentHtml } from '@/lib/pdf/template';

describe('documentHtml', () => {
  it('escapes user-controlled markdown and keeps Japanese text', () => {
    const html = documentHtml({
      title: '借入資料 <script>alert(1)</script>',
      markdown: '# 見出し\n\n本文 <img src=x onerror=alert(1)>\n- 返済原資',
    });

    expect(html).toContain('借入資料 &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('<h1>見出し</h1>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('<li>返済原資</li>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
  });
});
