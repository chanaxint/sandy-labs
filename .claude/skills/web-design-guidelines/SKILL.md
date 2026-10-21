---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the pinned guidelines in `guidelines.md` (next to this file)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

The rules are vendored in `guidelines.md`, pinned from
`vercel-labs/web-interface-guidelines` (`command.md`, commit 434b7f9, 2026-10-05)
and reviewed before adding. Upstream fetches them fresh on every run; this project
pins them so reviews never execute unreviewed remote instructions.

To refresh: download
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`,
diff it against `guidelines.md`, review the changes, then replace the file and update
the commit above.

## Usage

When a user provides a file or pattern argument:
1. Read `guidelines.md`
2. Read the specified files
3. Apply all rules from the guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
