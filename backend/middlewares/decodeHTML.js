/**
 * Middleware to decode HTML entities in all string fields
 * Fixes the &lt; &gt; encoding issue that breaks C/C++ code compilation
 */

const decodeHTMLEntities = (str) => {
    if (!str || typeof str !== 'string') return str;

    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
};

/**
 * Recursively decode all string values in an object
 */
const decodeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => decodeObject(item));
    }

    const decoded = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (typeof value === 'string') {
                decoded[key] = decodeHTMLEntities(value);
            } else if (typeof value === 'object') {
                decoded[key] = decodeObject(value);
            } else {
                decoded[key] = value;
            }
        }
    }

    return decoded;
};

/**
 * Express middleware to decode HTML entities in request body
 */
module.exports = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = decodeObject(req.body);
        console.log('✅ HTML entities decoded in request body');
    }
    next();
};

module.exports.decodeHTMLEntities = decodeHTMLEntities;
module.exports.decodeObject = decodeObject;
