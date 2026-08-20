import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");
const serverTarget = join(root, "src-tauri", "server");

const env = { ...process.env };
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  // .env.local missing — fall back to current process env
}

// Desktop must resolve OAuth redirects to the local server.
env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3111";

const build = spawnSync("npx", ["next", "build"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
});
if (build.status !== 0) process.exit(build.status ?? 1);

cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
mkdirSync(join(standalone, ".next"), { recursive: true });
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
});

rmSync(serverTarget, { recursive: true, force: true });
mkdirSync(serverTarget, { recursive: true });
cpSync(standalone, serverTarget, { recursive: true });

const runtimeEnv = {
  ANILIST_CLIENT_ID: env.ANILIST_CLIENT_ID,
  ANILIST_CLIENT_SECRET: env.ANILIST_CLIENT_SECRET,
  MAL_CLIENT_ID: env.MAL_CLIENT_ID,
  MAL_CLIENT_SECRET: env.MAL_CLIENT_SECRET,
};
for (const k of Object.keys(runtimeEnv)) {
  if (runtimeEnv[k] === undefined) delete runtimeEnv[k];
}
writeFileSync(
  join(serverTarget, "server-env.json"),
  JSON.stringify(runtimeEnv, null, 2),
);

console.log("[desktop-prepare] standalone server ready in src-tauri/server");