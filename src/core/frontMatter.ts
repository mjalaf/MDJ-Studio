/**
 * FrontMatter utilities for MD and MDJ documents.
 * Handles YAML front matter extraction, stripping, and envelope updates.
 */

export interface ParsedFrontMatter {
  raw: string;
  hasFrontMatter: boolean;
  attributes: Record<string, any>;
  body: string;
}

export function parseFrontMatter(content: string): ParsedFrontMatter {
  if (!content.startsWith('---')) {
    return {
      raw: '',
      hasFrontMatter: false,
      attributes: {},
      body: content,
    };
  }

  const endMatch = content.slice(3).indexOf('\n---');
  if (endMatch === -1) {
    return {
      raw: '',
      hasFrontMatter: false,
      attributes: {},
      body: content,
    };
  }

  const yamlBlock = content.slice(3, endMatch + 3).trim();
  const body = content.slice(endMatch + 7).replace(/^\r?\n/, '');
  const attributes: Record<string, any> = {};

  const lines = yamlBlock.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Simple array parsing [item1, item2]
      if (value.startsWith('[') && value.endsWith(']')) {
        const items = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
        attributes[key] = items;
      } else {
        // Unquote if quoted
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        attributes[key] = value;
      }
    }
  }

  return {
    raw: content.slice(0, endMatch + 7),
    hasFrontMatter: true,
    attributes,
    body,
  };
}

export function extractDocumentMetadata(content: string, filename: string): { title: string; tags: string[] } {
  const { attributes, body } = parseFrontMatter(content);

  let title = attributes.title;
  if (!title) {
    // Find first h1
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    } else {
      title = filename.replace(/\.(md|mdj|mmd|txt)$/i, '');
    }
  }

  let tags: string[] = [];
  if (Array.isArray(attributes.tags)) {
    tags = attributes.tags;
  } else if (typeof attributes.tags === 'string') {
    tags = attributes.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  return { title, tags };
}

export function ensureMdjEnvelope(content: string, extensionName = 'mdj-directives'): string {
  const parsed = parseFrontMatter(content);
  if (!parsed.hasFrontMatter) {
    const envelope = `---\ntitle: "Documento MDJ"\nmdj:\n  version: "1.2"\n  extensions:\n    - name: ${extensionName}\n      required: false\n---\n\n`;
    return envelope + content;
  }

  // Already has front matter
  if (content.includes('mdj:')) {
    return content;
  }

  // Inject mdj section before end of front matter
  const raw = parsed.raw.trim();
  const withoutEnd = raw.replace(/\n?---$/, '');
  const newFrontMatter = `${withoutEnd}\nmdj:\n  version: "1.2"\n  extensions:\n    - name: ${extensionName}\n      required: false\n---\n\n`;
  return newFrontMatter + parsed.body;
}
