import DOMPurify from 'dompurify';

// Configuration for different content types
const configs = {
  // For rich text content (posts, comments, etc.)
  content: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style', 'class', 'id']
  },
  
  // For basic text with links only
  basic: {
    ALLOWED_TAGS: ['a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style', 'class', 'id']
  },

  // For comments (more restrictive)
  comment: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style', 'class', 'id']
  }
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param type - The type of content ('content', 'basic', 'comment')
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, type: 'content' | 'basic' | 'comment' = 'content'): string {
  if (!html) return '';
  
  const config = configs[type];
  
  // Configure DOMPurify to add target="_blank" and rel="noopener noreferrer" to all external links
  DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    // Set all elements with target to target=_blank
    if ('target' in node) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    // Set non-HTML/MathML links to xlink:show=new
    if (!node.hasAttribute('target') && (node.hasAttribute('xlink:href') || node.hasAttribute('href'))) {
      node.setAttribute('xlink:show', 'new');
    }
  });

  const sanitized = DOMPurify.sanitize(html, config);
  
  // Remove the hook after use to prevent side effects
  DOMPurify.removeAllHooks();
  
  return sanitized;
}

/**
 * Strips all HTML tags and returns plain text
 * @param html - The HTML string to strip
 * @returns Plain text string
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Processes text with links and line breaks, then sanitizes it
 * @param text - The text to process
 * @returns Sanitized HTML string with links and line breaks
 */
export function processAndSanitizeText(text: string): string {
  if (!text) return '';
  
  // Convert line breaks to HTML line breaks
  let processed = text.replace(/\n/g, '<br />');
  
  // Convert URLs to links (basic URL detection)
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
  processed = processed.replace(urlRegex, '<a href="$1">$1</a>');
  
  // Sanitize the result
  return sanitizeHtml(processed, 'basic');
}

/**
 * Truncates HTML content safely by stripping HTML first
 * @param html - The HTML string to truncate
 * @param maxLength - Maximum length of the text
 * @returns Truncated plain text
 */
export function truncateHtmlSafely(html: string, maxLength: number = 150): string {
  const plainText = stripHtml(html);
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength) + '...';
}