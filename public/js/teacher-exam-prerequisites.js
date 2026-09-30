// Small compatibility helpers for the exam assignment UI on teacherdash.html.
var quizQuestions = [];

function hasMathContent(text) {
  return String(text || '').includes('$') || String(text || '').includes('\\') || /[\u2200-\u22FF\u2190-\u21FF\u25A0-\u25FF]/.test(String(text || ''));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function autoWrapMath(value) {
  const source = String(value ?? '');
  const katex = window.katex;
  if (!katex) return escapeHtml(source);

  const argument = String.raw`\{(?:[^{}]|\{[^{}]*\})*\}`;
  const commandPattern = new RegExp(String.raw`\\[a-zA-Z]+(?:\[[^\]]*\])?(?:${argument}){0,2}`, 'g');
  let output = '';
  let lastIndex = 0;
  let match;

  while ((match = commandPattern.exec(source)) !== null) {
    output += escapeHtml(source.slice(lastIndex, match.index));
    const prefix = source.slice(0, match.index);
    const insideDollarMath = (prefix.match(/(?<!\\)\$/g) || []).length % 2 === 1;
    const insideParenMath = prefix.lastIndexOf('\\(') > prefix.lastIndexOf('\\)');
    const insideBracketMath = prefix.lastIndexOf('\\[') > prefix.lastIndexOf('\\]');

    if (insideDollarMath || insideParenMath || insideBracketMath) {
      output += escapeHtml(match[0]);
    } else {
      const previousCharacter = source.slice(0, match.index).slice(-1);
      const nextCharacter = source.slice(match.index + match[0].length, match.index + match[0].length + 1);
      if (/[A-Za-z\u0980-\u09FF]/.test(previousCharacter) && !/\s$/.test(output)) output += ' ';
      try {
        output += katex.renderToString(match[0], { throwOnError: false, strict: false });
      } catch {
        output += escapeHtml(match[0]);
      }
      if (/[A-Za-z\u0980-\u09FF]/.test(nextCharacter)) output += ' ';
    }
    lastIndex = commandPattern.lastIndex;
  }

  return output + escapeHtml(source.slice(lastIndex));
}
