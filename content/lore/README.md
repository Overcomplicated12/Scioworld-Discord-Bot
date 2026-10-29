# ScioVirtual lore contributions

Add new lore as a `.json` file in this folder. The bot's lore adapter can load each file as a separate story or collection.

Players can read the collection with `/lore`, use `/lore action:list` to see stories, or use `/lore action:search query:term` to find entries.

## File template

Copy this shape and replace the values:

```json
{
  "id": "unique-story-id",
  "title": "Story title",
  "author": "Contributor name",
  "description": "One-sentence description",
  "tags": ["lore", "topic"],
  "entries": [
    {
      "id": "unique-entry-id",
      "title": "Entry title",
      "text": "The lore entry goes here.",
      "tags": ["optional", "entry-tag"]
    }
  ]
}
```

## Rules

- Use lowercase kebab-case for `id` values, such as `frog-of-wisdom-gets-lost-in-spain`.
- Story IDs and entry IDs must be unique.
- Keep `title`, `author`, `description`, and `entries` in every story file.
- Every entry needs its own `id`, `title`, and `text`.
- Keep entries short enough to read comfortably in Discord.
- Use normal JSON: double quotes, commas between fields, and no comments.
- Do not put sensitive information, private names, or personal contact details in lore.
- Prefer playful, welcoming stories that do not target or embarrass real community members.

## Before submitting

1. Check that the file extension is `.json`.
2. Validate the file with a JSON validator or `node`:

   ```bash
   npm run check-content
   ```

3. Read the entry aloud once. If the joke depends on private context, add enough explanation for a new player to enjoy it.
4. Submit the file for review before it is added to a public event or collectible. The check rejects malformed JSON, tabs, trailing whitespace, missing final newlines, and incomplete story shapes.

The example story in this folder is a template as well as a playable lore concept. Copy it when starting a new story, then change the IDs and content.
