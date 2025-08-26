import { sanitizeHtml, processAndSanitizeText, stripHtml, truncateHtmlSafely } from './html-sanitizer';

export const truncateUrl = (url: string, maxLength: number = 30): string => {
  if (url.length <= maxLength) {
    return url;
  }
  return url.substring(0, maxLength) + '...';
};

export const processTextWithLinks = (text: string): string => {
  if (!text) return '';
  
  // Convert line breaks to HTML line breaks
  let processedText = text.replace(/\n/g, '<br />');
  
  // Regex to find URLs
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
  
  processedText = processedText.replace(urlRegex, (url) => {
    const displayUrl = truncateUrl(url);
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline" title="${url}">${displayUrl}</a>`;
  });
  
  // Sanitize the processed text to prevent XSS
  return sanitizeHtml(processedText, 'basic');
};

// Use the secure stripHtml from html-sanitizer
export { stripHtml } from './html-sanitizer';

export const cleanHtmlForEditor = (html: string): string => {
  if (!html) return '';
  
  // Remove style attributes and CSS
  let cleaned = html.replace(/style="[^"]*"/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Remove script tags
  cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove unwanted attributes but keep basic formatting
  cleaned = cleaned.replace(/class="[^"]*"/gi, '');
  cleaned = cleaned.replace(/id="[^"]*"/gi, '');
  
  // Convert some common HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  
  // Keep only basic formatting tags
  const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  
  cleaned = cleaned.replace(tagPattern, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      // For links, preserve href attribute
      if (tagName.toLowerCase() === 'a' && match.includes('href=')) {
        return match.replace(/\s+((?!href=)[a-zA-Z-]+="[^"]*")/g, '');
      }
      return `<${tagName.toLowerCase()}>`.replace(match.substring(1, match.length - 1), tagName.toLowerCase());
    }
    return '';
  });
  
  return cleaned.trim();
};

export const truncateText = (text: string, maxLength: number = 150): string => {
  return truncateHtmlSafely(text, maxLength);
};

export const truncateWithTooltip = (text: string, maxLength: number = 30): { truncated: string; full: string; needsTooltip: boolean } => {
  const strippedText = stripHtml(text);
  const needsTooltip = strippedText.length > maxLength;
  const truncated = needsTooltip ? strippedText.substring(0, maxLength) + '...' : strippedText;
  
  return {
    truncated,
    full: strippedText,
    needsTooltip
  };
};