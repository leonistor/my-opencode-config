// Local plugin package for opencode-pty on OpenCode V2.
//
// Why this file exists at all:
//   opencode-pty's V2 plugin is a subpath export (`opencode-pty/v2`), which
//   OpenCode cannot install from a config package spec — npm parses
//   `opencode-pty/v2` as the GitHub shorthand `github:opencode-pty/v2` and the
//   install fails. So it is shipped as a local plugin *package directory*
//   (OpenCode discovers immediate directories under `plugins/`).
//
// Why it does more than re-export:
//   The published 0.4.0 V2 entry registers its commands but NEVER adds the pty
//   tools to the host, so `pty_spawn`/`pty_write`/`pty_read`/`pty_list`/
//   `pty_kill` are silently missing and every call fails (upstream issue #86;
//   the fix, PR #61, is on `main` but in no release). We register them here,
//   mirroring upstream `registerV2Tools`.
//
// When a release ships the fix (0.4.1+ with PR #84's dual-mode default export)
// remove the tool registration below and go back to `export { default } from
// "opencode-pty/v2"`. Keep the package dir until then: the subpath spec remains
// uninstallable from opencode.jsonc (issue #85).
import base, { ptyTools } from "opencode-pty/v2"
import { tool } from "@opencode-ai/plugin"

type V1Tool = {
  description: string
  args: Record<string, unknown>
  execute: (args: never, context: never) => Promise<unknown>
}

async function registerPtyTools(ctx: any): Promise<void> {
  const transform = ctx?.tool?.transform
  if (typeof transform !== "function") return
  await transform((editor: any) => {
    if (typeof editor?.add !== "function") return
    for (const [name, definition] of Object.entries(ptyTools as Record<string, V1Tool>)) {
      editor.add({
        name,
        description: definition.description,
        // The V1 tool definitions describe their args as a Zod raw shape; V2
        // wants JSON Schema. Same conversion upstream uses.
        input: tool.schema.toJSONSchema(tool.schema.object(definition.args)),
        execute: async (input: unknown, context: unknown) => {
          const result = await definition.execute(input as never, context as never)
          // The pty tools return strings; adapt to the V2 result envelope.
          return typeof result === "string" ? { content: result } : result
        },
      })
    }
  })
}

const originalSetup = (base as { setup?: (ctx: any) => unknown }).setup

export default {
  ...base,
  setup: async (ctx: any) => {
    await originalSetup?.(ctx)
    await registerPtyTools(ctx)
  },
}
