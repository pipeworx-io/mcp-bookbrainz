# @pipeworx/bookbrainz

BookBrainz MCP — open book metadata database run by the MetaBrainz Foundation (sister project to MusicBrainz). No auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `search(query, type, limit?, offset?)` — search any entity type: work / edition / author / publisher / series / edition-group
- `lookup(type, bbid, includes?)` — fetch a single entity by BookBrainz UUID
- `browse(type, ...)` — list works/editions/authors filtered by relationships

## Data source

`https://api.bookbrainz.org/` — public REST + JSON. Coverage is much smaller than Open Library or Google Books but it's the canonical home for open editions / works for Wikidata-style data modeling.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "bookbrainz": {
      "url": "https://gateway.pipeworx.io/bookbrainz/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Bookbrainz data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
