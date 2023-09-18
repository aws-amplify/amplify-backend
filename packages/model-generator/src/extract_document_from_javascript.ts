/**
 * extracts GraphQL Documents from generated JavaScript/TypeScript files
 */
export const extractDocumentFromJavaScript = (
  content: string
): string | null => {
  const re = new RegExp('\\s*`([^`/]*)`', 'g');

  let match;
  const matches = [];

  while ((match = re.exec(content))) {
    const doc = match[1].replace(/\${[^}]*}/g, '');

    matches.push(doc);
  }

  const doc = matches.join('\n');
  return doc.length ? doc : null;
};
