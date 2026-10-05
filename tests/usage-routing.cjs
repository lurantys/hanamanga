/* eslint-disable @typescript-eslint/no-require-imports -- Load the proxy with an isolated auth client. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks = {}) {
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

let authCalls = 0;
const { proxy, config } = load('proxy.ts', {
  '@/lib/bots': load('lib/bots.ts'),
  '@supabase/ssr': { createServerClient: () => {
    authCalls++;
    return { auth: { getUser: async () => ({ data: { user: null } }) } };
  } },
});
const readerMatcher = new RegExp(`^(?:${config.matcher[1].has[0].value})$`);

(async () => {
  for (const userAgent of ['meta-externalagent/1.1', 'META-EXTERNALAGENT/1.1', 'facebookexternalhit/1.1', 'Googlebot', 'bingbot', 'Twitterbot', 'Discordbot', 'WhatsApp', 'iframely']) {
    assert.equal(readerMatcher.test(userAgent), true, `${userAgent} must reach the crawler gate`);
    const response = await proxy(new NextRequest('https://hana.example/read/al:123/chapter-1?tracking=1', {
      headers: { 'user-agent': userAgent },
    }));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://hana.example/manga/al:123');
  }
  for (const userAgent of ['Mozilla/5.0 Chrome/140.0 Safari/537.36', 'Mozilla/5.0 iPhone AppleWebKit/605.1.15 Safari/604.1']) {
    assert.equal(readerMatcher.test(userAgent), false, 'normal browsers must skip reader middleware');
    const response = await proxy(new NextRequest('https://hana.example/read/al:123/chapter-1', {
      headers: { 'user-agent': userAgent },
    }));
    assert.equal(response.headers.get('location'), null);
  }
  assert.equal(authCalls, 0, 'reader requests must never call Supabase auth');
  const account = await proxy(new NextRequest('https://hana.example/account'));
  assert.equal(authCalls, 1);
  assert.equal(account.headers.get('location'), 'https://hana.example/login?next=%2Faccount');
  console.log('Usage routing checks passed: crawler redirects, human bypass, account auth');
})().catch((error) => { console.error(error); process.exitCode = 1; });
