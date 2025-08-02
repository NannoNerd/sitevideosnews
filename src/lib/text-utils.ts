export const truncateUrl = (url: string, maxLength: number = 30): string => {
  if (url.length <= maxLength) {
    return url;
  }
  return url.substring(0, maxLength) + '...';
};

export const processTextWithLinks = (text: string): string => {
  // Regex to find URLs
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
  
  return text.replace(urlRegex, (url) => {
    const displayUrl = truncateUrl(url);
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline" title="${url}">${displayUrl}</a>`;
  });
};

export const stripHtml = (html: string): string => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

export const truncateText = (text: string, maxLength: number = 150): string => {
  const strippedText = stripHtml(text);
  if (strippedText.length <= maxLength) {
    return strippedText;
  }
  return strippedText.substring(0, maxLength) + '...';
};