import poemIndex from "./poems.json" with { type: "json" };

const poemLoads = new Map();

export const POEMS = poemIndex.flatMap(({ level, poem }) =>
  poem.map(({ name }) => ({ level, name }))
);

export function poemDataUrl({ level, name }, fileName) {
  if (!level || !name) {
    throw new TypeError("Poem level and name are required");
  }
  return new URL(
    `${encodeURIComponent(level)}/${encodeURIComponent(name)}/${fileName}`,
    import.meta.url
  );
}

export function loadPoem(poemEntry) {
  const cacheKey = JSON.stringify([poemEntry.level, poemEntry.name]);
  if (!poemLoads.has(cacheKey)) {
    const url = poemDataUrl(poemEntry, "poem.json");
    const request = fetch(url).then(async response => {
      if (!response.ok) {
        throw new Error(`Failed to load poem data for "${poemEntry.name}": ${response.status}`);
      }
      const poem = await response.json();
      if (!poem.id || !Array.isArray(poem.author) || !Array.isArray(poem.couplets)) {
        throw new TypeError(`Invalid poem data in folder "${poemEntry.name}"`);
      }
      return poem;
    }).catch(error => {
      poemLoads.delete(cacheKey);
      throw error;
    });
    poemLoads.set(cacheKey, request);
  }
  return poemLoads.get(cacheKey);
}
