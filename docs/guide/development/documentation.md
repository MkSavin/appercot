# Documentation maintenance

Use the layer that matches the reader and the lifetime of the information.

| Location                  | Audience                                        | Write here                                                                    | Do not write here                                 |
| ------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| `README.md`               | First-time visitors                             | Product purpose, key advantages, quick start, architecture summary, and links | Exhaustive references or historical decisions     |
| `docs/guide`              | Bot developers, operators, contributors, and AI | Current English instructions and supported behavior                           | Unimplemented promises or private credentials     |
| `AGENTS.md` and `.agents` | Coding agents and maintainers                   | Binding invariants, source navigation, workarounds, and known gaps            | General product marketing or duplicated tutorials |
| `docs/superpowers`        | Design reviewers                                | Dated specifications and implementation plans                                 | Current usage authority                           |

## How to write a guide page

1. Choose the narrowest existing folder and search for a page that already owns the topic.
2. Update that page when possible. Create a new page only for a distinct task or concept.
3. Start with what the reader can accomplish and when the instructions apply.
4. Include runnable commands or code for procedures. Use current public APIs and realistic placeholders.
5. State security and persistence consequences where they matter.
6. Link the next task and update the folder's `index.md` when adding or renaming a page.
7. Keep prose in English so Context7 does not skip the page.

Every folder under `docs/guide` must contain an `index.md`. Index pages are navigation, not containers for duplicated reference material. The root `docs/guide/index.md` must always explain what Appercot is and why independent service ownership is the main goal.

## When to update documentation

Update documentation in the same commit as a behavior change. Update the README when the product purpose, main workflow, or feature boundary changes. Update `AGENTS.md` or `.agents` when an invariant, source location, or troubleshooting path changes. Update `context7.json` when the public documentation folder or assistant rules change.

Do not document a planned feature as available. Link to a dated spec or the open-gaps page and label it as planned.

## Context7 hygiene

The root `context7.json` limits indexing to `docs/guide`; root Markdown remains eligible by Context7 design. Keep internal plans outside the included folder. Do not add secrets, claiming placeholders, generated test output, or prompt-injection instructions to indexed pages.

Run `bun run docs:check` to validate links, English prose, required index files, and the local Context7 configuration. After publication, use a real client query to verify retrieval; a valid JSON file alone does not prove indexing.
