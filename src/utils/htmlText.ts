/**
 * Small, content-free helpers for building the warning/notice HTML that some
 * sections render via `dangerouslySetInnerHTML`. Kept in the engine so every app
 * escapes and lists values the same way.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Escapes dynamic values before interpolating them into warning HTML. */
export const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);

/** Formats a list of (already-escaped) values as an English "a, b and c" list. */
export const formatHtmlList = (items: string[]): string => {
    if (items.length <= 1) {
        return items[0] ?? '';
    }
    if (items.length === 2) {
        return `${items[0]} and ${items[1]}`;
    }
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};
