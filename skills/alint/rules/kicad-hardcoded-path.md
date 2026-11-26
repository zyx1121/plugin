---
id: kicad-hardcoded-path
engine: grep
files: ["**/*.{py,ps1,sh,ts,mjs,toml}"]
exclude: ["**/alint/rules/**"]
pattern: "[A-Za-z]:[\\/]+Program Files[\\/]+KiCad"
source: memory pcb-flow-survey; vacuum-controller tools ported to the KiCad container (2026-11-26)
---

Board scripts do not name one machine's KiCad install. A path under the
Windows program folder breaks the same script in the KiCad container and in
CI. Call `kicad-cli` from `PATH`, or read it from an environment variable.

## Bad

`CLI = r"C:\Program Files\KiCad\10.0\bin\kicad-cli.exe"`

## Good

`CLI = os.environ.get("KICAD_CLI") or shutil.which("kicad-cli")`
