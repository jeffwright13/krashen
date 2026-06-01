const SUPPORTED_SCHEMAS = new Set(['krashen-library-v1']);

export function parseLibraryJSON(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('File is not valid JSON'); }
  if (!obj.schema || !SUPPORTED_SCHEMAS.has(obj.schema)) {
    throw new Error(`Unrecognised or missing schema field: "${obj.schema}"`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('entries must be an array');
  }
  return obj.entries;
}

const PROFILE_SCHEMAS = new Set(['krashen-profile-v1']);

export function parseProfileBundle(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('File is not valid JSON'); }
  if (!obj.schema || !PROFILE_SCHEMAS.has(obj.schema)) {
    throw new Error(`Unrecognised profile export format: "${obj.schema}"`);
  }
  if (!obj.profile || typeof obj.profile.name !== 'string' || !obj.profile.name.trim()) {
    throw new Error('Missing or invalid profile data');
  }
  if (!obj.vocab || typeof obj.vocab !== 'object' || Array.isArray(obj.vocab)) {
    throw new Error('Missing or invalid vocab data');
  }
  return { profile: obj.profile, vocab: obj.vocab };
}
