/* eslint-disable @typescript-eslint/no-require-imports -- Compile server modules with isolated provider doubles. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod.require = (id) => id in mocks ? mocks[id] : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const cache = { unstable_cache: (fn) => fn };
const chapter = { id: 'native-1', label: 'Chapter 1', number: 1, url: 'https://provider/chapter-1' };
function scenario({ weeb = true, legacy = false } = {}) {
  let matches = 0, legacyRef;
  const mocks = {
    'next/cache': cache,
    'next/navigation': { notFound: () => { throw new Error('not found'); }, redirect: () => { throw new Error('redirect'); } },
    '@/lib/source': { parseMangaId: () => ({ source: 'al', ref: '1' }) },
    '@/lib/catalog': { fetchCatalogMangaWithFallback: async () => ({ id: 'al:1', title: 'Title' }), isNotFoundError: () => false },
    '@/lib/atsu': { buildAtsuReader: async () => null },
    '@/lib/mangadex': {},
    '@/lib/read': {
      getAtsuMatch: async () => null,
      getWeebLookup: async () => ({ manga: weeb ? {} : null, chapters: weeb ? [chapter] : [] }),
      getKatanaLookup: async () => ({ manga: {}, chapters: [chapter] }),
      mdRefForManga: async () => { matches++; return 'md-uuid'; },
    },
    '@/lib/weebcentral': {
      fetchWeebPages: async () => ['https://provider/page.jpg'],
      resolveWeebLegacyChapter: async (_chapters, ref) => { legacyRef = ref; return chapter; },
    },
    '@/lib/mangakatana': {
      fetchKatanaPages: async () => ['https://provider/page.jpg'],
      resolveLegacyChapter: async (_chapters, ref) => { legacyRef = ref; return chapter; },
    },
  };
  return { run: () => load('lib/reader-data.ts', mocks).buildReaderProps('al:1', legacy ? 'old-uuid' : chapter.id), counts: () => ({ matches, legacyRef }) };
}
(async () => {
  for (const weeb of [true, false]) {
    const native = scenario({ weeb });
    const data = await native.run();
    assert.equal(data.pages[0].image, 'https://provider/page.jpg');
    assert.equal(native.counts().matches, 0, 'native chapters must not wait for MangaDex matching');
    const legacy = scenario({ weeb, legacy: true });
    await legacy.run();
    assert.equal(legacy.counts().matches, 1);
    assert.equal(legacy.counts().legacyRef, 'md-uuid', 'legacy resolution requires the MangaDex ref, not the catalog ID');
  }
  let resolved;
  const preload = load('app/api/preload-chapter/route.ts', {
    'next/server': { NextResponse: { json: (body) => body } },
    '@/lib/reader-data': { buildReaderProps: async (mangaId, chapterId) => {
      resolved = [mangaId, chapterId];
      return { pages: [{ image: '/api/atsu-image?path=actual-provider' }] };
    } },
  });
  const result = await preload.GET(new Request('http://localhost/api/preload-chapter?mangaId=mangadex:123&chapterId=atsu-chapter'));
  assert.deepEqual(resolved, ['mangadex:123', 'atsu-chapter']);
  assert.deepEqual(result.pages, ['/api/atsu-image?path=actual-provider']);
  console.log('Reader loading checks passed: native lookup latency, legacy IDs, cross-provider preloading');
})().catch((error) => { console.error(error); process.exitCode = 1; });
