#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TRACKER_CSV="$REPO_ROOT/prep/tracker/daily-progress.csv"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <day-number-1-to-45>" >&2
  exit 1
fi

DAY_RAW="$1"
if ! [[ "$DAY_RAW" =~ ^[0-9]+$ ]]; then
  echo "Day must be numeric." >&2
  exit 1
fi

DAY_NUM=$((10#$DAY_RAW))
if (( DAY_NUM < 1 || DAY_NUM > 45 )); then
  echo "Day must be between 1 and 45." >&2
  exit 1
fi

DAY_FMT=$(printf "%02d" "$DAY_NUM")

if [[ ! -f "$TRACKER_CSV" ]]; then
  echo "Missing tracker file: $TRACKER_CSV" >&2
  exit 1
fi

ROW=$(awk -F',' -v day="$DAY_NUM" 'NR>1 && $1==day {print; exit}' "$TRACKER_CSV")
if [[ -z "$ROW" ]]; then
  echo "Could not find day $DAY_NUM in tracker CSV." >&2
  exit 1
fi

IFS=',' read -r _day date concept q1 q2 stretch _rest <<< "$ROW"

TS_DAY_DIR="$REPO_ROOT/prep/code/typescript/leetcode/day-$DAY_FMT"
GO_DAY_DIR="$REPO_ROOT/prep/code/golang/leetcode/day-$DAY_FMT"
GENAI_DAY_FILE="$REPO_ROOT/prep/code/typescript/genai-frontend/day-$DAY_FMT.md"
RETRIEVAL_DAY_FILE="$REPO_ROOT/prep/code/typescript/retrieval-systems/day-$DAY_FMT.md"

mkdir -p "$TS_DAY_DIR" "$GO_DAY_DIR"

Q1_FILE="$TS_DAY_DIR/q1.ts"
Q2_FILE="$TS_DAY_DIR/q2.ts"
STRETCH_FILE="$TS_DAY_DIR/stretch.ts"
NOTES_FILE="$TS_DAY_DIR/notes.md"
GO_FILE="$GO_DAY_DIR/practice.go"

if [[ ! -f "$Q1_FILE" ]]; then
  cat > "$Q1_FILE" <<EOF2
/**
 * Day $DAY_FMT - $date
 * Concept: $concept
 * Question: $q1
 */

export function solveQ1(input: unknown): unknown {
  // TODO
  return input;
}
EOF2
fi

if [[ ! -f "$Q2_FILE" ]]; then
  cat > "$Q2_FILE" <<EOF2
/**
 * Day $DAY_FMT - $date
 * Concept: $concept
 * Question: $q2
 */

export function solveQ2(input: unknown): unknown {
  // TODO
  return input;
}
EOF2
fi

if [[ ! -f "$STRETCH_FILE" ]]; then
  cat > "$STRETCH_FILE" <<EOF2
/**
 * Day $DAY_FMT - $date
 * Concept: $concept
 * Stretch: $stretch
 */

export function solveStretch(input: unknown): unknown {
  // TODO
  return input;
}
EOF2
fi

if [[ ! -f "$NOTES_FILE" ]]; then
  cat > "$NOTES_FILE" <<EOF2
# Day $DAY_FMT Notes

- Date: $date
- Concept: $concept
- Core Q1: $q1
- Core Q2: $q2
- Stretch: $stretch

## Mistakes
- 

## Complexity
- Q1:
- Q2:
- Stretch:

## Reattempt Plan
- 
EOF2
fi

if [[ ! -f "$GO_FILE" ]]; then
  cat > "$GO_FILE" <<EOF2
package main

import "fmt"

// Day $DAY_FMT - $date
// Concept: $concept
// Practice target: implement one key idea from today's TypeScript solutions.

func main() {
	fmt.Println("day-$DAY_FMT go practice")
}
EOF2
fi

if [[ ! -f "$GENAI_DAY_FILE" ]]; then
  cat > "$GENAI_DAY_FILE" <<EOF2
# Day $DAY_FMT - GenAI Frontend Notes

- Packet date: $date
- Concept link: $concept

## Design prompt response
-

## Frontend architecture decisions
-

## Telemetry events
-
EOF2
fi

if [[ ! -f "$RETRIEVAL_DAY_FILE" ]]; then
  cat > "$RETRIEVAL_DAY_FILE" <<EOF2
# Day $DAY_FMT - Retrieval Systems Notes

- Packet date: $date
- Concept link: $concept

## Pipeline considerations
-

## Reliability/failure modes
-

## Cost/performance tradeoffs
-
EOF2
fi

echo "Initialized code workspace for day-$DAY_FMT"
echo "- TS: $TS_DAY_DIR"
echo "- Go: $GO_DAY_DIR"
echo "- GenAI notes: $GENAI_DAY_FILE"
echo "- Retrieval notes: $RETRIEVAL_DAY_FILE"
