const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

function toSlug(text) {
  return slugify(text, { lower: true, strict: true });
}

function generateSlug(text) {
  return slugify(text, { lower: true, strict: true });
}

function generateUniqueSlug(text) {
  const baseSlug = toSlug(text);
  const shortId = uuidv4().substring(0, 8);
  return `${baseSlug}-${shortId}`;
}

module.exports = {
  toSlug,
  generateSlug,
  generateUniqueSlug
};
