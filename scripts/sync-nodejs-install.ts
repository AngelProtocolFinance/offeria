/**
 * auto-detects npm dependencies for each SST Lambda handler by traversing
 * its import tree with dependency-cruiser, then writes a sorted JSON array
 * to a co-located `<handler>.deps.json` file.
 *
 * resource / index files import that JSON and pass it to `nodejs: { install }`,
 * keeping the lists in sync without manual bookkeeping.
 *
 * usage:  pnpm dlx tsx scripts/sync-nodejs-install.ts
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { cruise } from "dependency-cruiser";

const ROOT = resolve(import.meta.dirname, "..");

// packages provided by the lambda runtime or irrelevant to bundling
const EXCLUDE_PATTERNS = [/^@types\//, /^aws-lambda$/, /^sst$/];

// -- helpers --

/** convert sst dot-notation ("path/handler.export") to a .ts file path */
function parse_handler_path(handler_str: string): string {
  const last_dot = handler_str.lastIndexOf(".");
  const file_path = handler_str.slice(0, last_dot);
  return resolve(ROOT, `${file_path}.ts`);
}

/** extract the bare package name from a deep import specifier */
function extract_pkg_name(module_name: string): string {
  // @scope/pkg/foo → @scope/pkg
  if (module_name.startsWith("@")) {
    const parts = module_name.split("/");
    return `${parts[0]}/${parts[1]}`;
  }
  // pkg/foo → pkg
  return module_name.split("/")[0];
}

// -- main --

async function main() {
  const pkg_json = JSON.parse(
    readFileSync(resolve(ROOT, "package.json"), "utf-8")
  );
  // only keep deps listed in package.json `dependencies` (not devDependencies)
  const prod_deps = new Set(Object.keys(pkg_json.dependencies ?? {}));

  // step 1 — discover handlers
  // scan every resource.ts / index.ts under .server/ for `handler: "..."` declarations
  const resource_files: string[] = [];
  for await (const f of glob(".server/**/{index,resource}.ts", {
    cwd: ROOT,
  })) {
    resource_files.push(resolve(ROOT, f));
  }

  const handler_re = /handler:\s*["'](.+?)["']/g;
  const handler_entries: { handler_file: string; deps_json_path: string }[] =
    [];

  for (const rf of resource_files) {
    const content = readFileSync(rf, "utf-8");
    let match: RegExpExecArray | null = handler_re.exec(content);
    while (match !== null) {
      const handler_file = parse_handler_path(match[1]);
      if (!existsSync(handler_file)) {
        console.warn(`  skip: handler file not found: ${handler_file}`);
        match = handler_re.exec(content);
        continue;
      }
      const dir = dirname(handler_file);
      const base = basename(handler_file, ".ts");
      // deps.json lives next to the handler: handler.ts → handler.deps.json
      const deps_json_path = join(dir, `${base}.deps.json`);
      handler_entries.push({ handler_file, deps_json_path });
      match = handler_re.exec(content);
    }
  }

  console.log(`found ${handler_entries.length} handlers\n`);

  // step 2 — traverse each handler's full import tree with dependency-cruiser
  const summary: { path: string; deps: string[] }[] = [];

  for (const { handler_file, deps_json_path } of handler_entries) {
    const rel = handler_file.replace(`${ROOT}/`, "");

    // dependency-cruiser resolves ts path aliases, handles circular deps,
    // re-exports, and marks type-only imports so we can exclude them
    const result = await cruise([handler_file], {
      tsConfig: { fileName: resolve(ROOT, "tsconfig.json") },
      // "specify" lets us check dep.typeOnly to skip type-only imports
      tsPreCompilationDeps: "specify",
      // don't recurse into node_modules — we only need the module boundary
      doNotFollow: { path: "node_modules" },
      progress: { type: "none" },
    });

    if (typeof result.output === "string") {
      console.warn(`  skip: cruise returned string for ${rel}`);
      continue;
    }

    // step 3 — collect npm package names from the module graph
    const npm_deps = new Set<string>();

    for (const mod of result.output.modules) {
      for (const dep of mod.dependencies) {
        // type-only imports (import type { ... }) don't need runtime install
        if (dep.typeOnly) continue;

        const is_npm = dep.dependencyTypes.some(
          (t) => t === "npm" || t === "npm-dev" || t === "npm-no-pkg"
        );
        if (!is_npm) continue;

        const pkg = extract_pkg_name(dep.module);

        // step 4 — filter: drop aws-sdk (lambda runtime), @types, etc.
        if (EXCLUDE_PATTERNS.some((re) => re.test(pkg))) continue;
        // only keep packages explicitly listed in package.json dependencies
        if (!prod_deps.has(pkg)) continue;

        npm_deps.add(pkg);
      }
    }

    const sorted = [...npm_deps].sort();

    // step 5 — write or clean up deps.json
    if (sorted.length === 0) {
      if (existsSync(deps_json_path)) {
        unlinkSync(deps_json_path);
        console.log(`  ${deps_json_path.replace(`${ROOT}/`, "")} (deleted)`);
      }
      summary.push({ path: rel, deps: [] });
      continue;
    }

    writeFileSync(deps_json_path, `${JSON.stringify(sorted, null, 2)}\n`);
    summary.push({ path: rel, deps: sorted });
    console.log(
      `  ${deps_json_path.replace(`${ROOT}/`, "")} → ${JSON.stringify(sorted)}`
    );
  }

  // step 6 — print summary
  console.log("\n--- summary ---");
  const with_deps = summary.filter((s) => s.deps.length > 0);
  const without_deps = summary.filter((s) => s.deps.length === 0);
  console.log(
    `${with_deps.length} handlers with deps, ${without_deps.length} without`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
