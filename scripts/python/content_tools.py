#!/usr/bin/env python3
"""Small dependency-free checks for content contributors.

The JavaScript validators remain authoritative for bot runtime content. This
tool is intended for quick repository checks and readable question-bank stats.
"""

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def validate_courses(path: Path) -> list[str]:
    required = {"role_id", "role_name", "instructor_user_id", "instructor_tag"}
    errors: list[str] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        headers = set(reader.fieldnames or [])
        missing = required - headers
        if missing:
            return [f"missing columns: {', '.join(sorted(missing))}"]
        rows = list(reader)
    if not rows:
        errors.append("CSV has no data rows")
    seen: set[tuple[str, str]] = set()
    for line, row in enumerate(rows, start=2):
        values = {key: (row.get(key) or "").strip() for key in required}
        if any(not value for value in values.values()):
            errors.append(f"line {line}: every required field must be non-empty")
        pair = (values["role_id"], values["instructor_user_id"])
        if all(pair) and pair in seen:
            errors.append(f"line {line}: duplicate role/instructor pair {pair[0]}/{pair[1]}")
        seen.add(pair)
    if not errors:
        roles = {row["role_id"].strip() for row in rows}
        print(f"Course CSV valid: {len(rows)} rows, {len(roles)} course role(s).")
    return errors


def validate_lore(directory: Path) -> list[str]:
    errors: list[str] = []
    story_ids: set[str] = set()
    entry_ids: set[str] = set()
    files = sorted(directory.glob("*.json"))
    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.name}: invalid JSON ({exc})")
            continue
        for field in ("id", "title", "author", "description"):
            if not isinstance(data.get(field), str) or not data[field].strip():
                errors.append(f"{path.name}: missing {field}")
        story_id = data.get("id")
        if story_id in story_ids:
            errors.append(f"{path.name}: duplicate story id {story_id}")
        story_ids.add(story_id)
        entries = data.get("entries")
        if not isinstance(entries, list) or not entries:
            errors.append(f"{path.name}: entries must be a non-empty list")
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                errors.append(f"{path.name}: entry must be an object")
                continue
            for field in ("id", "title", "text"):
                if not isinstance(entry.get(field), str) or not entry[field].strip():
                    errors.append(f"{path.name}: entry missing {field}")
            entry_id = entry.get("id")
            if entry_id in entry_ids:
                errors.append(f"{path.name}: duplicate entry id {entry_id}")
            entry_ids.add(entry_id)
    if not errors:
        print(f"Lore valid: {len(files)} stories, {len(entry_ids)} entries.")
    return errors


def analyze_questions(path: Path) -> list[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    activities = data.get("activities", [])
    if not activities:
        return ["question bank has no activities"]
    formats: dict[str, int] = {}
    choice_counts: list[int] = []
    prompt_lengths: list[int] = []
    missing_sources = 0
    for activity in activities:
        formats[activity.get("format", "unknown")] = formats.get(activity.get("format", "unknown"), 0) + 1
        choice_counts.append(len(activity.get("choices", [])))
        prompt_lengths.append(len(activity.get("prompt", "")))
        if activity.get("format") != "discussion" and not activity.get("source", ""):
            missing_sources += 1
    average = lambda values: sum(values) / len(values)
    print(f"Question bank: {len(activities)} activities; formats={formats}")
    print(f"Choices: {min(choice_counts)}–{max(choice_counts)} (average {average(choice_counts):.1f})")
    print(f"Prompt length: average {average(prompt_lengths):.0f} characters")
    if missing_sources:
        return [f"{missing_sources} factual activity/activities missing a source"]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    courses = subparsers.add_parser("courses", help="validate the repository course CSV")
    courses.add_argument("path", nargs="?", type=Path, default=ROOT / "Sciovirtual database - Sheet1.csv")
    lore = subparsers.add_parser("lore", help="validate lore JSON structure")
    lore.add_argument("path", nargs="?", type=Path, default=ROOT / "content" / "lore")
    questions = subparsers.add_parser("questions", help="summarize and check pilot questions")
    questions.add_argument("path", nargs="?", type=Path, default=ROOT / "content" / "pilot" / "season.json")
    args = parser.parse_args()
    try:
        errors = {"courses": validate_courses, "lore": validate_lore, "questions": analyze_questions}[args.command](args.path)
    except (OSError, json.JSONDecodeError, UnicodeError) as exc:
        errors = [str(exc)]
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
