---
name: deliver-task
description: Deliver one GitHub issue of Tehreer-ReactNative through the developer, code reviewer and QA loop, ending in a pull request. Use when asked to work on, deliver or run an issue (`/deliver-task <issue#>`), or when the orchestrating session starts a task session. Also contains the scheduling rule that at most 3 tasks run in parallel.
---

# Deliver one issue

Input: an issue number of `Tehreer/Tehreer-ReactNative`. Subagents cannot start subagents, so the session running this skill is the orchestrator and calls the three agents itself.

## 0. Preconditions

1. `gh issue view <n>`: read the acceptance criteria and `blocked by` links. Every blocker must be merged into `main`; if one is not, stop and say which.
2. You are in a git worktree on a branch `task/<n>-<slug>` cut from up-to-date `main`. If not, create it. Never work on `main`.
3. Read `AGENTS.md` and `.claude/skills/react-native-wrapper/SKILL.md`.

## 1. Loop (at most 3 rounds)

Each round:

1. **Develop.** Call `rn-developer` with the issue text, the branch, and (rounds 2 and 3) the open findings. Require its report.
2. **Review.** Call `rn-code-reviewer` on the branch. If it says `CHANGES REQUESTED`, send blockers and majors back to `rn-developer` (same round) and review again, at most twice per round.
3. **QA.** Only after the reviewer approves, call `rn-qa` with the branch and a scratch directory. QA owns the simulator and emulator while it runs; do not start another device run (the machine has one set of devices).
4. If QA reports a blocker or major, start the next round with those findings. If both reviewer and QA report none, go to section 2.

After round 3 without a clean result, stop, summarize the open findings, and ask the owner. Do not open the PR.

## 2. Pull request

1. Commit with subjects `[scope] imperative summary` (staged explicitly), push the branch, and open the PR against `main` with `gh pr create`. Body: `Closes #<n>`, what changed, commands run and results, the reviewer verdict and QA summary (verbatim summary lines plus any minor/nit left open), API breaks, and anything not verified. Label it like the issue.
2. Do not merge, do not enable auto-merge, do not push to `main`.
3. Report the PR URL.

## 3. Scheduling rule: at most 3 tasks in parallel

Applies to the session that decides which issues to run (the main session):

- Before starting a task session, count the running ones with `list_sessions` (`linked: true`); start another only while fewer than 3 are running. Never exceed 3 even if more issues are ready.
- Start a task only if all its `blocked by` issues are merged. When a blocker's PR is open but unmerged, ask the owner to merge it; do not stack branches.
- Do not run together two tasks that edit the same directory (the same `area:*`), or that both change generated files or the build scripts.
- Each task gets its own worktree and branch and a brief that says: run `/deliver-task <n>`, the repo path, "do not merge", and the scratch directory to use for QA.
- QA's simulator and emulator use is serialized across sessions: a task session that reaches QA while another task is in QA waits.
- When a task session ends, read its report and verify the PR (`gh pr view`) before saying it is done; then start the next ready issue.
