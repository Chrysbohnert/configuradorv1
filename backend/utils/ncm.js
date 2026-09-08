function normalizeNcm(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
}

module.exports = { normalizeNcm };
