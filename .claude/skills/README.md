# Project skills

Skills in this folder load automatically in Claude Code sessions opened in this repository.
They are committed so every session (including ephemeral cloud sessions) has them.

| Skill | Source | Commit | License | Changes made here |
| --- | --- | --- | --- | --- |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) `skills/frontend-design` | `dbd4588` | Apache-2.0 | None |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) `.claude/skills/ui-ux-pro-max` (v2.15.0) | `56ea9cf` | MIT | Script paths changed from `${CLAUDE_PLUGIN_ROOT}/.claude/skills/…` to `.claude/skills/…` (project install, not plugin); `scripts/tests/` removed. Sibling skills from that repo (banner-design, brand, design, design-system, slides, ui-styling) not installed. |
| `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins`, `gsap-performance`, `gsap-utils` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) `skills/` | `aed9cfd` | MIT | None. `gsap-frameworks` (Vue/Svelte) not installed. |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `skills/react-best-practices` | `063bee9` | MIT | Folder renamed to match the skill's `name`. |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) `skills/web-design-guidelines` + [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) `command.md` | `063bee9` / `434b7f9` | MIT | Rules vendored as `guidelines.md` and SKILL.md reads them locally instead of fetching remote instructions on every run. |
| `motion-react` | Written for this project from the installed `motion` 14.4.0 package and https://motion.dev/docs/react | — | — | Motion publishes no official agent skill. |
| `threejs-r3f` | Written for this project from https://threejs.org/docs/, https://r3f.docs.pmnd.rs/ and npm registry metadata | — | — | three.js / pmndrs publish no official agent skill. |

All third-party skills were read before adding. None declare `allowed-tools`. The only
executable code is `ui-ux-pro-max/scripts/*.py` (Python standard library; reads the bundled
CSV data; no network or subprocess use).

## Updating

Re-clone the source repo, diff the skill folder against this copy, review the changes
(especially any new scripts or `allowed-tools`), then replace the folder and update the
commit hash above. Re-apply the local changes listed in the table.
