/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader compiles the real TypeScript stores for Node. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Load the real stores without a browser or a running Supabase service.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const values = new Map();
global.window = new EventTarget();
window.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
global.document = { visibilityState: 'visible' };
const storageEvent = (key) => {
  const event = new Event('storage');
  event.key = key;
  window.dispatchEvent(event);
};
const progress = require('../lib/progress.ts');
const storage = require('../lib/storage.ts');
const library = require('../lib/library.ts');
const entry = (id, updatedAt) => ({
  mangaId: id, chapterId: 'chapter-2', chapterLabel: 'Chapter 2',
  mangaTitle: id, scrollFraction: 0.5, updatedAt,
});
progress.saveProgress(entry('guest-old', 1));
progress.setProgressUserId('account');
storage.setStorageUserId('account');
assert.deepEqual(progress.getContinueList(), []);
progress.saveProgress(entry('current', 2));
const snapshot = {
  manga: { id: 'current', title: 'Current', bannerUrl: '/banner.jpg', description: 'Full description', rating: 8 },
  chapterId: 'chapter-1', chapterLabel: 'Chapter 1', scrollFraction: 0.2, updatedAt: 1,
};
progress.saveContinueHero(snapshot);
progress.saveContinueHero({ ...snapshot, manga: { id: 'current', title: 'Current', bannerUrl: null }, chapterId: 'chapter-2', updatedAt: 2 });
assert.equal(progress.readContinueHero().manga.bannerUrl, '/banner.jpg');
assert.equal(progress.readContinueHero().manga.description, 'Full description');
assert.equal(progress.readContinueHero().chapterId, 'chapter-2');
progress.invalidateContinueHero();
assert.equal(progress.readContinueHero().manga.bannerUrl, '/banner.jpg');
progress.saveContinueHero({ ...snapshot, manga: { id: 'other', title: 'Other' } });
assert.equal(progress.readContinueHero().manga.bannerUrl, undefined);

const offProgress = progress.subscribeProgress(() => {});
const offHero = progress.subscribeContinueHero(() => {});
const offLibrary = library.subscribeLibrary(() => {});
const previous = progress.getContinueList();
values.set('hana:progress:account', JSON.stringify({ newer: entry('newer', 3) }));
storageEvent('hana:progress:account');
assert.equal(progress.getContinueList()[0].mangaId, 'newer');
assert.notEqual(progress.getContinueList(), previous);
assert.equal(progress.getContinueList(), progress.getContinueList());
values.set('hana:continue-hero:account', JSON.stringify(snapshot));
storageEvent('hana:continue-hero:account');
assert.equal(progress.readContinueHero().manga.id, 'current');
library.getLibrarySnapshot();
values.set('hana:library:account', JSON.stringify({ current: { manga: snapshot.manga, addedAt: 2 } }));
storageEvent('hana:library:account');
assert.equal(library.getLibraryList()[0].manga.id, 'current');
values.clear();
storageEvent(null);
assert.deepEqual(progress.getContinueList(), []);
assert.equal(progress.readContinueHero(), null);
assert.deepEqual(library.getLibraryList(), []);
offProgress(); offHero(); offLibrary();
// Identical remote/local data used to skip every store notification during
// account restoration, leaving subscribers stuck on the guest snapshot.
require('../lib/supabase/client.ts').createClient = () => ({
  from: () => {
    const query = {
      select: () => query, eq: () => query, single: () => query,
      upsert: () => query, delete: () => query, in: () => query,
      then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return query;
  },
  channel: () => {
    const channel = { on: () => channel, subscribe: () => channel, unsubscribe: async () => {} };
    return channel;
  },
});
const sync = require('../lib/sync.ts');
(async () => {
  let notifications = 0;
  const unsubscribe = progress.subscribeProgress(() => notifications++);
  await sync.handleAuthStateChange('account');
  assert.ok(notifications > 0, 'account selection must notify even when the remote data is identical');
  await Promise.all([
    sync.handleAuthStateChange('second'),
    sync.handleAuthStateChange('third'),
  ]);
  assert.equal(sync.getCurrentUserId(), 'third');
  assert.equal(progress.getProgressUserId(), 'third');
  assert.equal(storage.getStorageUserId(), 'third');
  await sync.handleAuthStateChange(null);
  unsubscribe();
  console.log('Home state regression checks passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
