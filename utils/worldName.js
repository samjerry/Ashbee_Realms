/**
 * Replace default world name with custom world name in text
 * @param {string} text - Text containing world name references
 * @param {string} worldName - Custom world name
 * @returns {string} Text with world name replaced
 */
function replaceWorldName(text, worldName = 'Ashbee Realms') {
  if (!text) return text;
  
  // Replace all variations
  const replacements = [
    ['Ashbee Realms', worldName],
    ['Ashbee_Realms', worldName.replace(/\s+/g, '_')],
    ['Ashbee realms', worldName],
    ['ashbee realms', worldName.toLowerCase()]
  ];
  
  let result = text;
  for (const [from, to] of replacements) {
    result = result.replace(new RegExp(from, 'g'), to);
  }
  
  return result;
}

module.exports = { replaceWorldName };
