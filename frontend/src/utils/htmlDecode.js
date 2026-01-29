/**
 * Decode HTML entities in a string
 * Converts &lt; to <, &gt; to >, etc.
 */
export const decodeHTMLEntities = (str) => {
    if (!str) return str;

    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
};

/**
 * Encode HTML entities in a string
 * Converts < to &lt;, > to &gt;, etc.
 */
export const encodeHTMLEntities = (str) => {
    if (!str) return str;

    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
