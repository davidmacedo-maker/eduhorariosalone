#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# clean-git-tracked.sh
#
# Remove from the git index (without deleting from disk) all files that are
# now covered by .gitignore but were previously committed.
# Run once from the repo root, then commit the result.
#
# Usage:
#   bash scripts/clean-git-tracked.sh
#   git commit -m "chore: untrack build artefacts and dev-only files"
#   git push
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "▶ Removing ZIP / archive files from git index..."
git rm --cached --ignore-unmatch \
  "*.zip" \
  "*.tar.gz" \
  "EduHorarios-GitHub-Pages.zip" \
  "EduHorarios-github.zip" \
  "EduHorarios_GitHub.zip" \
  "EduHorarios_projeto.zip" \
  "eduhorarios-standalone.zip" \
  "eduhorarios.zip" \
  "EduHorarios.zip" \
  "school-scheduler-github.zip" \
  "launcher-win/EduHorarios-Windows.zip" 2>/dev/null || true

echo "▶ Removing attached_assets/ from git index..."
git rm --cached -r --ignore-unmatch attached_assets/ 2>/dev/null || true

echo "▶ Removing launcher-win/ from git index..."
git rm --cached -r --ignore-unmatch launcher-win/ 2>/dev/null || true

echo "▶ Removing tools/ from git index..."
git rm --cached -r --ignore-unmatch tools/ 2>/dev/null || true

echo "▶ Removing artifacts/mockup-sandbox/ from git index..."
git rm --cached -r --ignore-unmatch artifacts/mockup-sandbox/ 2>/dev/null || true

echo "▶ Removing .agents/ from git index..."
git rm --cached -r --ignore-unmatch .agents/ 2>/dev/null || true

echo ""
echo "✔  Done. Files removed from git tracking (still on disk)."
echo ""
echo "Next steps:"
echo "  git commit -m 'chore: untrack build artefacts and dev-only files'"
echo "  git push"
echo ""
echo "After pushing, Render will only clone the essential source files."
