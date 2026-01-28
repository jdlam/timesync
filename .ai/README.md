# AI Agent Documentation

This directory contains shared documentation for AI coding assistants (Claude, Cursor, Windsurf, etc.).

## Structure

```
.ai/
├── README.md              # This file
├── ARCHITECTURE.md        # Architecture overview and references
└── diagrams/              # Mermaid diagram files (.mmd)
    ├── architecture.mmd       # High-level system architecture
    ├── event-creation.mmd     # Event creation sequence
    ├── response-submission.mmd # Response submission sequence
    ├── heatmap-visualization.mmd # Heatmap rendering sequence
    └── auth-flow.mmd          # Authentication/authorization flow
```

## Diagrams

Diagrams are stored as `.mmd` (mermaid) files for:
- Better IDE support with mermaid extensions
- Export to SVG/PNG via mermaid CLI
- Reusability across multiple documents
- Cleaner version control diffs

### Viewing Diagrams

**VS Code:** Install [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension

**CLI:**
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i diagrams/architecture.mmd -o diagrams/architecture.svg
```

**Online:** Paste into [mermaid.live](https://mermaid.live)

## Agent Configuration

Each AI agent has its own configuration file that references this shared documentation:

| Agent | Config File | Location |
|-------|-------------|----------|
| Claude Code | `CLAUDE.md` | Root |
| Cursor | `.cursorrules` | Root |
| Windsurf | `.windsurfrules` | Root |

## Updating

When making significant architectural changes:
1. Update relevant `.mmd` files in `diagrams/`
2. Update `ARCHITECTURE.md` if adding new diagrams or changing structure
3. Optionally regenerate SVG/PNG exports for documentation
