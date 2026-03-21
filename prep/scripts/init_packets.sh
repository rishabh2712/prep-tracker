#!/usr/bin/env bash
set -euo pipefail

for i in $(seq -w 1 45); do
  file="prep/packets/day-${i}.md"
  if [[ -f "$file" ]]; then
    continue
  fi
  cat > "$file" <<'EOT'
# Day XX - DATE

## Focus
- Concept:
- Sub-focus:

## Coding Block (120 min)
- Core Q1:
- Core Q2:
- Stretch:

## Design Block (60 min)
- Prompt:
- Expected output:

## Build Block (45 min)
- Task:
- Definition of done:

## Leadership Block (20 min)
- Question:
- STAR-L bullets:

## Review (15 min)
- What I got wrong:
- Complexity summary:
- Reattempt date:
- Next-day adjustment:
EOT

  sed -i '' "s/Day XX/Day ${i}/" "$file"

done

echo "Initialized day-01 to day-45 packets."
