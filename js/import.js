const SUPPORTED_SCHEMAS = new Set(['krashen-library-v1']);

export function parseLibraryJSON(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  const obj = JSON.parse(text);
  if (!obj.schema || !SUPPORTED_SCHEMAS.has(obj.schema)) {
    throw new Error(`Unrecognised or missing schema field: "${obj.schema}"`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('entries must be an array');
  }
  return obj.entries;
}
