/**
 * Prove that every file carrying the version agrees, for repos where the
 * version lives in more than one manifest (tauri: package.json,
 * src-tauri/tauri.conf.json, Cargo.toml, Cargo.lock).
 *
 *   bun run check:versions   exit 1 when the files disagree, used by CI
 *
 * Release-please writes those files on the release PR, so this is a guard, not
 * an editor: it never rewrites anything. A disagreement means a hand edit or a
 * missing `extra-files` entry in release-please-config.json, and it is caught
 * on the pull request instead of by a release that ships mismatched versions.
 *
 * Edit `sources` to match the repo, then wire it up:
 *   package.json  "scripts": { "check:versions": "bun scripts/check-versions.ts" }
 */
import { readFile } from 'node:fs/promises'

/** The `version` of the first JSON object, never a dependency range. */
const JSON_VERSION = /("version":\s*")[^"]+(")/

/** The `version` of the `[package]` or `[workspace.package]` table. */
const CARGO_VERSION = /(\[(?:workspace\.)?package\][^[]*?\bversion\s*=\s*")[^"]+(")/

/** The `version` line of one crate's entry in the lock file. */
function lockVersion(crate: string): RegExp {
  // `\r?\n` because a Windows checkout hands these files over with CRLF.
  return new RegExp(`(name = "${crate}"\\r?\\nversion = ")[^"]+(")`)
}

type Source = {
  /** Label in the output, the file path plus the crate for lock entries. */
  label: string
  path: string
  pattern: RegExp
}

const sources: Source[] = [
  { label: 'package.json', path: 'package.json', pattern: JSON_VERSION },
  {
    label: 'src-tauri/tauri.conf.json',
    path: 'src-tauri/tauri.conf.json',
    pattern: JSON_VERSION,
  },
  { label: 'Cargo.toml', path: 'Cargo.toml', pattern: CARGO_VERSION },
  {
    label: 'Cargo.lock REPLACE_CRATE',
    path: 'Cargo.lock',
    pattern: lockVersion('REPLACE_CRATE'),
  },
]

function read(source: Source, text: string): string {
  const found = text.match(source.pattern)
  if (found === null) {
    console.error(`no version to read in ${source.label}`)
    process.exit(3)
  }
  return found[0].slice(found[1].length, -found[2].length)
}

const versions = new Map<string, string>()
for (const source of sources) {
  versions.set(source.label, read(source, await readFile(source.path, 'utf8')))
}
for (const [label, version] of versions) console.log(`${version}\t${label}`)

const distinct = new Set(versions.values())
if (distinct.size !== 1) {
  console.error('\nversion files disagree; fix the extra-files entry in release-please-config.json')
  process.exit(1)
}
console.log(`\nversion ${[...distinct][0]}`)
