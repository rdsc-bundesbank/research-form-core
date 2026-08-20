import { describe, expect, it } from 'vitest';
import { escapeHtml, formatHtmlList } from '../src/utils/htmlText';
import { formatAuthorName } from '../src/utils/formatAuthorName';

describe('html text utilities', () => {
  it('escapes HTML-sensitive characters in dynamic text', () => {
    expect(escapeHtml(`<script data-x="1">Tom & 'Jerry'</script>`)).toBe(
      '&lt;script data-x=&quot;1&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/script&gt;',
    );
  });

  it('formats short English lists', () => {
    expect(formatHtmlList([])).toBe('');
    expect(formatHtmlList(['A'])).toBe('A');
    expect(formatHtmlList(['A', 'B'])).toBe('A and B');
    expect(formatHtmlList(['A', 'B', 'C'])).toBe('A, B and C');
  });
});

describe('formatAuthorName', () => {
  it('uses available name parts and trims missing values', () => {
    expect(formatAuthorName({ first_name: 'Alice', surname: 'Ng' }, 0)).toBe('Alice Ng');
    expect(formatAuthorName({ first_name: ' Alice ', surname: '' }, 0)).toBe('Alice');
    expect(formatAuthorName({ first_name: '', surname: 'Ng' }, 0)).toBe('Ng');
  });

  it('falls back to one-based author labels when no name is present', () => {
    expect(formatAuthorName({ first_name: '', surname: '' }, 2)).toBe('Author 3');
    expect(formatAuthorName(undefined)).toBe('');
  });
});
