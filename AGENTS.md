# Tehreer-ReactNative — Agent Guide

React Native wrapper of [Tehreer Core](https://github.com/Tehreer/Tehreer-Core), a lightweight, dependency-free text engine written in C89. Licensed under Apache 2.0.

The wrapper exposes the whole public Core API to React Native through one C++ JSI layer shared by iOS and Android, a TypeScript API shaped like Tehreer-Web, Tehreer-Android and Tehreer-Cocoa, and thin native views that draw with `Canvas` (Android) and `CGContext` (iOS).

**Hard constraints:** new architecture only (Fabric, C++ TurboModule, Hermes); no Skia; no WebAssembly; no new dependency of any kind without asking; Core owns all text logic and the wrapper stays a thin bridge.

**Read first:** `.claude/skills/react-native-wrapper/SKILL.md`. It holds the full rules (ownership, memory, callbacks, mapping, drawing, update workflow). `.claude/skills/web-wrapper/SKILL.md` is the reference for the TypeScript API shape and mapping table; the Web repo is `../Tehreer-Web`.

## Layout

| Path | Role |
|------|------|
| `Libraries/TehreerCore/` | Git submodule of Tehreer-Core, pinned to a SHA |
| `cpp/` | JSI runtime (handles, structs, callbacks), generated bindings, the C++ TurboModule |
| `ios/`, `android/` | Build files, platform painters, Fabric views |
| `scripts/` | Binding generator, dependency fetch, Core sync |
| `src/` | TypeScript API, same folders and names as Tehreer-Web, plus `views/` |
| `example/` | Test-runner app used by tests and QA |
| `tests/` | Node tests for the generator and pure TypeScript |

Sibling repos (read-only references): `../Tehreer-Core`, `../Tehreer-Web`, `/Users/mta/Personal/UrduFeeds/tehreerAndroid`, `/Users/mta/Personal/UrduFeeds/tehreerCocoa`.

## Core submodule

A clone or a new git worktree has an empty `Libraries/TehreerCore/`. Run `git submodule update --init` (or clone with `--recurse-submodules`) before building or testing, and use `submodules: recursive` in every CI checkout. Builds and tests that read Core's headers fail without it. Agents must do this first in their own checkout.

## Commands

Commands exist only once the issue that creates them has landed; `package.json` is the source of truth.

```bash
npm run typecheck
npm run lint
npm test
npm run test:ios
npm run test:android
```

## Device test output

The example app (`example/App.tsx`) runs every suite registered in `example/tests/index.ts` (one `{ name, run(bindings) }` entry per package or issue) and writes these lines to the system log; `scripts/test-device.mjs` parses them with `scripts/device/DeviceResults.mjs`:

```
TEHREER_SUITE name=<suite> passed=<p> total=<t>
TEHREER_FAIL <suite>/<test>: <message>
TEHREER_RESULT version=<Core version> smokeTest=<true|false> suites=<k> passed=<p> total=<t>
TEHREER_RESULT error=<message>
```

One `TEHREER_SUITE` line per suite, one `TEHREER_FAIL` line per failed test (a suite that throws as a whole is reported as the failed test `(suite)`), and exactly one final `TEHREER_RESULT`. The run passes only if the version matches Core's, `smokeTest=true`, the suite lines add up to the result line, `total` is not 0 and `passed` equals `total`. A failing test, a timeout (90 s) or a missing result line exits non-zero. Scripts must never kill processes by name or pattern (`pkill`, `killall`); they signal only the pid or process group of a child they spawned (`tests/scripts.test.ts` enforces this).

## Conventions

- TypeScript strict, ES modules, imports end in `.js`, no default exports, one class per file named after the class.
- C++ glue is C++20 (React Native 0.88 compiles with `-std=c++20` on both platforms), `snake_case` is not used: types and functions PascalCase, members `camelCase`, private members `_camelCase`. Core stays C89; never edit Core from this repo (change it in `../Tehreer-Core`, test it there, then bump the submodule).
- Match the nearest existing file for naming, comments and structure. Comments say why, not what. Public TypeScript API has TSDoc.
- Names mirror Tehreer-Web, Android and Cocoa where they agree.
- Do not weaken or delete a test to get green. Do not add a dependency, download a file, or change CI secrets without asking.
- Commit subjects: `[lib]`, `[native]`, `[ios]`, `[android]`, `[test]`, `[ci]`, `[docs]` + imperative summary. Do not commit or push unless the task says so.

## Work is done through GitHub issues

Each issue is one unit of work with acceptance criteria, `blocked by` links, and labels `area:*`, `type:*`, `size:*`, milestone `M0`..`M3`. One issue = one branch `task/<number>-<slug>` = one pull request that says `Closes #<number>`. The main session merges after the merge gate in `deliver-task` passes; the owner has authorized this, and anything outside the gate comes back to the owner.

## The agent loop

Three project agents (`.claude/agents/`): `rn-developer` (implements and fixes), `rn-code-reviewer` (read-only review), `rn-qa` (builds, runs on device, probes, reports defects; writes scratch files only). The skill `deliver-task` (`/deliver-task <issue#>`) runs them:

1. developer implements and runs the gates (typecheck, lint, tests); the PR is opened;
2. the reviewer reviews the PR and its findings are posted on GitHub as review comments; the developer fixes and replies on each thread; repeat until `APPROVE`;
3. QA builds and runs on the iOS simulator and the Android emulator and probes; its report is posted on the PR; the developer fixes defects, and the reviewer and QA re-check;
4. done when the latest review says `APPROVE` and QA reports no blocker or major; after 3 rounds without that, stop and ask the owner;
5. the main session checks the merge gate in `deliver-task` and squash-merges the PR.

Subagents cannot start subagents, so the session that runs `/deliver-task` is the orchestrator of a task.

**Review comments identity.** Until the owner sets up a review bot (a Claude GitHub App or a bot token), comments are posted from the owner's GitHub account and start with `🤖 Claude reviewer:` or `🤖 Claude QA:`. A review by the PR's own author cannot be an approving review, so the verdict is written in the review text.

### Parallelism

**At most 3 tasks run at the same time**, each in its own session and its own git worktree. The orchestrator counts the running task sessions before starting one (`list_sessions` with `linked: true`), starts the next only when fewer than 3 are running, and never starts an issue whose `blocked by` issues are not merged into `main`. Two tasks that touch the same files do not run together: label `area:*` decides, and issues with the same area wait for each other when they edit the same directory. Simulators and emulators are shared machine resources: only one task session runs device tests at a time (QA step), the others queue.

## Boundaries

Never: commit secrets, push to `main`, force-push, delete branches you did not create, edit files in sibling repos (they are references), add a dependency or download that the owner has not approved in chat, or run anything that needs a password. Only the main session merges, and only through the merge gate in `deliver-task`.
