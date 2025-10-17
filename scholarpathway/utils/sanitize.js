const sanitizeHtml = require('sanitize-html');

const allowed = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'p', 'ul', 'ol', 'li', 'a', 'h3', 'h4', 'blockquote', 'code', 'pre', 'br'],
  allowedAttributes: { 
    a: ['href', 'title', 'rel', 'target'] 
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener', target: '_blank' })
  }
};

function clean(input) {
  return sanitizeHtml(input || '', allowed);
}

function cleanPlainText(input) {
  return sanitizeHtml(input || '', { allowedTags: [], allowedAttributes: {} });
}

module.exports = { 
  clean, 
  cleanPlainText 
};