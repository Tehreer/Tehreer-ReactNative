---
name: deliver-task
description: Deliver one GitHub issue of Tehreer-ReactNative through development, a pull request, code review on GitHub, fixes, QA and merge. Use when asked to work on, deliver or run an issue (`/deliver-task <issue#>`), or when the orchestrating session starts a task session. Also contains the scheduling rule that at most 3 tasks run in parallel and the merge gate.
---

# Deliver one issue

Input: an issue number of `Tehreer/Tehreer-ReactNative`. Subagents cannot start subagents, so the session running this skill is the orchestrator of the task and calls the three agents itself. The **main session** (the one that started task sessions) does the final merge, section 3.

## 0. Preconditions

1. `gh issue view <n>`: read the acceptance criteria and `blocked by` links. Every blocker must be merged into `main`; if one is not, stop and say which.
2. You are in a git worktree on a branch `task/<n>-<slug>` cut from up-to-date `main`. If not, create it. Never work on `main`.
3. Read `AGENTS.md` and `.claude/skills/react-native-wrapper/SKILL.md`.

## 1. Develop, then open the PR

1. Call `rn-developer` with the issue text and the branch. Require its report (what changed, commands run and results, what could not be verified).
2. Commit with subject `[scope] imperative summary` (stage files explicitly), push the branch and open the PR against `main` with `gh pr create`: `Closes #<n>`, what changed, commands run and results, not verified. Label it like the issue. The PR is opened **before** review so that review lives on GitHub.

## 2. Review on GitHub, fix, QA

Repeat for at most 3 rounds:

1. **Review.** Run `rn-code-reviewer` on the PR branch and publish its result on the PR:
   - findings as inline review comments (`gh api repos/{owner}/{repo}/pulls/<pr>/reviews` with `comments`, or `gh pr review --comment` for the summary), each starting with its ID (`R1`, …) and severity;
   - the verdict (`APPROVE` or `CHANGES REQUESTED`) in the review summary.
   Until the review bot is set up (see `AGENTS.md`), start every comment with `🤖 Claude reviewer:` since it is posted from the owner's account.
2. **Fix.** If the verdict is `CHANGES REQUESTED`, give blockers and majors to `rn-developer`. It pushes fixes and replies on each thread saying what it did (or why not). Then go back to step 1. Minor and nit findings are fixed or answered with a reason, never ignored.
3. **QA.** After `APPROVE`, run `rn-qa` on the branch with a scratch directory and post its summary as a PR comment starting with `🤖 Claude QA:`. QA owns the simulator and emulator while it runs. If it reports a blocker or major, give them to `rn-developer`, push, and start the next round at step 1.
4. When the latest review says `APPROVE` and QA reports no blocker or major, stop the loop and report the PR as ready to merge.

After round 3 without a clean result, stop, summarize the open findings on the PR and to the owner, and ask. Do not report the PR as ready.

## 3. Merge gate (done by the main session)

The owner authorized the main session to merge. Merge a PR only when **all** of these hold, checked by reading the PR (`gh pr view`, `gh pr checks`), not by trusting a report:

- the latest review verdict is `APPROVE` and no review thread with a blocker or major is unresolved;
- the latest QA comment reports no blocker or major, and it was made on the current head commit;
- all required CI checks are green (none exist before the CI issue lands: then reviewer and QA alone are the gate);
- the PR changes no dependency, lockfile entry, download, secret or CI credential that the owner has not approved in chat;
- the PR is mergeable (no conflicts) and targets `main`.

Then: `gh pr merge <pr> --squash --delete-branch`, confirm the issue closed, and start the issues that this one unblocked (section 4). Never force-push, never push to `main`, never merge with a failing gate. If any condition is unclear, ask the owner.

## 4. Scheduling rule: at most 3 tasks in parallel

Applies to the main session that decides which issues to run:

- Before starting a task session, count the running ones with `list_sessions` (`linked: true`); start another only while fewer than 3 are running. Never exceed 3 even if more issues are ready.
- Start a task only if all its `blocked by` issues are merged into `main`.
- Do not run together two tasks that edit the same directory (the same `area:*`), or that both change generated files, lockfiles or the build scripts.
- Each task gets its own worktree and branch and a brief that says: run `/deliver-task <n>`, the repo path, "do not merge", and the scratch directory for QA.
- QA's simulator and emulator use is serialized across sessions: a task session that reaches QA while another task is in QA waits.
- When a task session ends, read its report and verify the PR before saying it is done; then merge per section 3 and start the next ready issues.
