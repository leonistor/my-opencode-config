// Local plugin package for opencode-pty on OpenCode V2.
//
// opencode-pty's V2 plugin is a subpath export (`opencode-pty/v2`), which
// OpenCode cannot install or resolve from a config package spec: plain npm
// parses `opencode-pty/v2` as the GitHub shorthand `github:opencode-pty/v2`
// and the install fails with `NpmInstallFailedError: An unknown git error
// occurred`.
//
// So we ship it as a local plugin *package directory* (OpenCode V2 discovers
// immediate directories under `plugins/` and resolves their dependencies from
// this package's own node_modules). `opencode-pty/v2` exposes the V2
// definition as both a named `Plugin` and a default export.
export { default } from "opencode-pty/v2"
