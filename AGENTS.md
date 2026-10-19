# osim.dev

Personal site at https://osim.dev: Astro 7 with static output, a Markdown blog, a
resume PDF, and two small Cloudflare Workers.

## Layout

- `src/pages/`, `src/layouts/`, `src/styles/`: the site
- `src/content/blog/*.md`: blog posts (frontmatter schema in `src/content.config.ts`)
- `resume/resume.typ`: resume source; `resume/BUILD.md` has the build steps
- `public/`: copied to the site as-is, including the resume PDFs
- `workers/pi-counter/`, `workers/spotify/`: Cloudflare Workers, deployed by hand
- `scripts/`: maintenance scripts that use real credentials

## Commands

- `bun install`, then `bun run dev`
- Before committing, run what CI runs:
  `bun run format:check && bun run check && bun run build && bun run test`

## Deploys

Merging to `main` deploys the site to Cloudflare Pages from CI
(`.github/workflows/ci.yml`), and only after `verify` passes. Nothing else deploys
the site.

## Scripts and Workers

`scripts/*.sh` and the Workers in `workers/` use real credentials that the user
sets as environment variables before running them. Deploying or configuring a
Worker (`wrangler deploy`, KV, secrets) and running a script follow the
"Sensitive work" rule below.

## Ask before changing

- Resume content (`resume/` and the PDFs in `public/`)
- Published blog posts (typo fixes are fine; changing what a post says isn't)

## Rules (same in every salt-mountain repo)

- **Ask, don't assume.** Don't act on anything the user hasn't explicitly
  approved, and don't state anything you haven't verified in the code, docs or
  command output. If unsure, say what you checked and ask.
- **Identity:** commit only as
  `salt-mountain <48201364+salt-mountain@users.noreply.github.com>` (check
  `git config user.email` first). No `Co-authored-by` or "Generated with" lines
  naming anyone else, AI tools included.
- **Secrets:** never read, print, stage or commit secret files (`.env*` except
  `*.example`, `.dev.vars`, `*.pem` and other keys, `cdk-outputs.json`,
  credentials) or credential values from the environment. Check
  `git diff --cached --name-only` before every commit. If a secret was
  committed, stop and tell the user: it needs rotating, not a follow-up commit.
- **Sensitive work: hand the user the command.** For anything involving secrets
  or the repo's scripts, default to giving the user the exact commands to run;
  run them yourself only when the user says so. Pass secrets through environment
  variables the user sets, never as values in a command, a file or the chat:
  - The user sets one without it showing on screen or in shell history:
    `read -rs CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN`
  - Commands then use the name (`$CLOUDFLARE_API_TOKEN`), or a tool's own prompt
    (`wrangler secret put NAME`).
  - Never ask the user to paste a secret into the chat, and never echo, log or
    write a variable's value.
  - Keep commands short, one per line: long pasted lines can wrap and break.
- **Deploys and other outside changes:** normally only CI deploys, on merge to
  `main`. Anything that deploys, publishes, or changes cloud resources, DNS or
  secrets (`wrangler … deploy`, `wrangler … secret`, `cdk deploy`,
  `docker push`, the repo's scripts) runs only after the user approves that
  specific command.
- **Git:** conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`,
  `ci:`); short, descriptive branch names (`feat/blog-rss`). Ask before every
  `git push`. You may open the PR once the push is approved. Merge, tag or
  release only when told to (you may ask).
- **PR descriptions:** three short parts: the problem, the solution, and
  anything a reviewer needs to know about this change (risks, required
  follow-ups). Every sentence must be about this PR's change: leave out other
  planned work, work in other areas, and anything that isn't needed to review
  or act on this PR. Verification details belong in the chat, not the PR.
- **Tests:** add or update tests for any page or behaviour you change, in the
  same PR.
- **Dependencies:** Dependabot and Renovate handle upgrades. Bump a version by
  hand (for example, to skip a cooldown) only if the user approves. A new
  package needs a reason in the PR and an exact version (`bun add --exact`),
  with `bun.lock` committed. Bun's pins (`packageManager`, `.bun-version`) only
  move together.
