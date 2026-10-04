import type { SearchMatch, FindReplaceOptions } from '../types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchRegex(query: string, matchCase: boolean, wholeWord: boolean): RegExp | null {
  if (!query) return null;
  const escaped = escapeRegex(query);
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = matchCase ? 'g' : 'gi';
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export function findMatches(
  content: string,
  options: Pick<FindReplaceOptions, 'query' | 'matchCase' | 'wholeWord'>,
  documentInfo?: { id?: string; name?: string }
): SearchMatch[] {
  const { query, matchCase, wholeWord } = options;
  if (!query) return [];

  const regex = buildSearchRegex(query, matchCase, wholeWord);
  if (!regex) return [];

  const matches: SearchMatch[] = [];
  let match: RegExpExecArray | null;

  // Track line numbers
  const lineOffsets: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      lineOffsets.push(i + 1);
    }
  }

  const getLineNumber = (index: number): number => {
    let low = 0;
    let high = lineOffsets.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] <= index) {
        if (mid === lineOffsets.length - 1 || lineOffsets[mid + 1] > index) {
          return mid + 1;
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return 1;
  };

  while ((match = regex.exec(content)) !== null) {
    const index = match.index;
    const length = match[0].length;
    const line = getLineNumber(index);

    const startContext = Math.max(0, index - 30);
    const endContext = Math.min(content.length, index + length + 30);

    const contextBefore = content.substring(startContext, index).replace(/\n/g, ' ');
    const matchText = match[0];
    const contextAfter = content.substring(index + length, endContext).replace(/\n/g, ' ');

    matches.push({
      index,
      length,
      line,
      text: matchText,
      documentId: documentInfo?.id,
      documentName: documentInfo?.name,
      contextBefore,
      matchText,
      contextAfter,
    });

    // Prevent infinite loop on zero-length matches
    if (regex.lastIndex === index) {
      regex.lastIndex++;
    }
  }

  return matches;
}

export function replaceNext(
  content: string,
  match: SearchMatch,
  replacement: string
): string {
  if (match.index < 0 || match.index + match.length > content.length) {
    return content;
  }
  return (
    content.substring(0, match.index) +
    replacement +
    content.substring(match.index + match.length)
  );
}

export function replaceAll(
  content: string,
  options: Pick<FindReplaceOptions, 'query' | 'replacement' | 'matchCase' | 'wholeWord'>
): { newContent: string; count: number } {
  const { query, replacement, matchCase, wholeWord } = options;
  if (!query) return { newContent: content, count: 0 };

  const regex = buildSearchRegex(query, matchCase, wholeWord);
  if (!regex) return { newContent: content, count: 0 };

  let count = 0;
  const newContent = content.replace(regex, () => {
    count++;
    return replacement;
  });

  return { newContent, count };
}
