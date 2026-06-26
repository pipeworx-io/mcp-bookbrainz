interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * BookBrainz MCP — open book metadata (MetaBrainz / sister of MusicBrainz)
 *
 * Auth: none.
 * Docs: https://api.bookbrainz.org/1/docs/
 */


const BASE = 'https://api.bookbrainz.org/1';

const ENTITY_TYPES = ['work', 'edition', 'author', 'publisher', 'series', 'edition-group'] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

const tools: McpToolExport['tools'] = [
  {
    name: 'search',
    description: 'Search BookBrainz (MetaBrainz open book database) for works, editions, authors, publishers, series, or edition-groups by free-text query. Returns matching entity records with their BookBrainz UUIDs (bbids) for use with lookup.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query' },
        type: { type: 'string', description: 'work | edition | author | publisher | series | edition-group' },
        limit: { type: 'number', description: '1-50 (default 10)' },
        offset: { type: 'number', description: '0-based offset' },
      },
      required: ['query', 'type'],
    },
  },
  {
    name: 'lookup',
    description: 'Fetch a single BookBrainz entity (work, edition, author, publisher, series, or edition-group) by its UUID (bbid), with optional sub-resources (aliases, relationships, identifiers) via the includes parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'work | edition | author | publisher | series | edition-group' },
        bbid: { type: 'string', description: 'BookBrainz UUID' },
        includes: {
          type: 'string',
          description: 'Comma-sep optional sub-resources (aliases, relationships, identifiers, ...)',
        },
      },
      required: ['type', 'bbid'],
    },
  },
  {
    name: 'browse',
    description: 'Browse entities of a type filtered by a related entity. e.g. browse editions by work, works by author.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Target entity type' },
        author: { type: 'string', description: 'Author bbid filter' },
        work: { type: 'string', description: 'Work bbid filter' },
        edition: { type: 'string', description: 'Edition bbid filter' },
        publisher: { type: 'string', description: 'Publisher bbid filter' },
        series: { type: 'string', description: 'Series bbid filter' },
        edition_group: { type: 'string', description: 'edition-group bbid filter' },
        limit: { type: 'number', description: '1-25 (default 10)' },
        offset: { type: 'number', description: '0-based offset' },
      },
      required: ['type'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search':
      return search(args);
    case 'lookup':
      return lookup(args);
    case 'browse':
      return browse(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqType(args: Record<string, unknown>): EntityType {
  const t = reqStr(args, 'type', '"work"');
  if (!(ENTITY_TYPES as readonly string[]).includes(t)) {
    throw new Error(`Unknown entity type "${t}". Expected one of: ${ENTITY_TYPES.join(', ')}.`);
  }
  return t as EntityType;
}

async function search(args: Record<string, unknown>) {
  const type = reqType(args);
  const params = new URLSearchParams({
    q: reqStr(args, 'query', '"dune"'),
    type,
    size: String(Math.min(50, Math.max(1, (args.limit as number) ?? 10))),
    from: String(Math.max(0, (args.offset as number) ?? 0)),
  });
  return bbGet(`/search?${params}`);
}

async function lookup(args: Record<string, unknown>) {
  const type = reqType(args);
  const bbid = reqStr(args, 'bbid', '"abc-123-..."');
  const params = new URLSearchParams();
  if (args.includes) params.set('includes', String(args.includes));
  return bbGet(`/${type}/${encodeURIComponent(bbid)}${params.toString() ? `?${params}` : ''}`);
}

async function browse(args: Record<string, unknown>) {
  const type = reqType(args);
  const params = new URLSearchParams({
    size: String(Math.min(25, Math.max(1, (args.limit as number) ?? 10))),
    from: String(Math.max(0, (args.offset as number) ?? 0)),
  });
  for (const f of ['author', 'work', 'edition', 'publisher', 'series'] as const) {
    if (args[f]) params.set(f, String(args[f]));
  }
  if (args.edition_group) params.set('edition-group', String(args.edition_group));
  return bbGet(`/${type}?${params}`);
}

async function bbGet(path: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'pipeworx-mcp-bookbrainz/1.0 (+https://pipeworx.io)',
    },
  });
  if (res.status === 404) throw new Error('BookBrainz: not found');
  if (res.status === 429) throw new Error('BookBrainz: rate-limit (HTTP 429)');
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`BookBrainz error: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
