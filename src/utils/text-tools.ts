import {AnswerAction} from "../types";
import i18nJSON from './i18n.json';

export function buildMdFromAnswer(answer: AnswerAction) {
  // Standard footnote regex
  const footnoteRegex = /\[\^(\d+)]/g;

  // New regex to catch grouped footnotes like [^1, ^2, ^3] or [^1,^2,^3]
  const groupedFootnoteRegex = /\[\^(\d+)(?:,\s*\^(\d+))+]/g;

  // Helper function to format references
  const formatReferences = (refs: typeof answer.references) => {
    return refs.map((ref, i) => {
      const cleanQuote = ref.exactQuote
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ');

      const citation = `[^${i + 1}]: ${cleanQuote}`;

      if (!ref.url?.startsWith('http')) return citation;

      const domainName = new URL(ref.url).hostname.replace('www.', '');
      return `${citation} [${domainName}](${ref.url})`;
    }).join('\n\n');
  };

  // First case: no references - remove any footnote citations
  if (!answer.references?.length) {
    return answer.answer
      .replace(groupedFootnoteRegex, (match) => {
        // Extract all numbers from the grouped footnote
        const numbers = match.match(/\d+/g) || [];
        return numbers.map(num => `[^${num}]`).join(', ');
      })
      .replace(footnoteRegex, '');
  }

  // Fix grouped footnotes first
  const processedAnswer = answer.answer.replace(groupedFootnoteRegex, (match) => {
    // Extract all numbers from the grouped footnote
    const numbers = match.match(/\d+/g) || [];
    return numbers.map(num => `[^${num}]`).join(', ');
  });

  // Now extract all footnotes from the processed answer
  const footnotes: string[] = [];
  let match;
  while ((match = footnoteRegex.exec(processedAnswer)) !== null) {
    footnotes.push(match[1]);
  }

  // No footnotes in answer but we have references - append them at the end
  if (footnotes.length === 0) {
    const appendedCitations = Array.from(
      {length: answer.references.length},
      (_, i) => `[^${i + 1}]`
    ).join('');

    const references = formatReferences(answer.references);

    return `
${processedAnswer}

⁜${appendedCitations}

${references}
`.trim();
  }

  // Check if correction is needed
  const needsCorrection =
    (footnotes.length === answer.references.length && footnotes.every(n => n === footnotes[0])) ||
    (footnotes.every(n => n === footnotes[0]) && parseInt(footnotes[0]) > answer.references.length) ||
    (footnotes.length > 0 && footnotes.every(n => parseInt(n) > answer.references.length));

  // New case: we have more references than footnotes
  if (answer.references.length > footnotes.length && !needsCorrection) {
    // Get the used indices
    const usedIndices = new Set(footnotes.map(n => parseInt(n)));

    // Create citations for unused references
    const unusedReferences = Array.from(
      {length: answer.references.length},
      (_, i) => !usedIndices.has(i + 1) ? `[^${i + 1}]` : ''
    ).join('');

    return `
${processedAnswer} 

⁜${unusedReferences}

${formatReferences(answer.references)}
`.trim();
  }

  if (!needsCorrection) {
    return `
${processedAnswer}

${formatReferences(answer.references)}
`.trim();
  }

  // Apply correction: sequentially number the footnotes
  let currentIndex = 0;
  const correctedAnswer = processedAnswer.replace(footnoteRegex, () =>
    `[^${++currentIndex}]`
  );

  return `
${correctedAnswer}

${formatReferences(answer.references)}
`.trim();
}

export const removeExtraLineBreaks = (text: string) => {
  return text.replace(/\n{2,}/gm, '\n\n');
}

export function chooseK(a: string[], k: number) {
  // randomly sample k from `a` without repitition
  return a.sort(() => 0.5 - Math.random()).slice(0, k);
}

export function removeHTMLtags(text: string) {
  return text.replace(/<[^>]*>?/gm, '');
}


export function getI18nText(key: string, lang = 'en', params: Record<string, string> = {}) {
  // 获取i18n数据
  const i18nData = i18nJSON as Record<string, any>;
  // 确保语言代码存在，如果不存在则使用英语作为后备
  if (!i18nData[lang]) {
    console.error(`Language '${lang}' not found, falling back to English.`);
    lang = 'en';
  }

  // 获取对应语言的文本
  let text = i18nData[lang][key];

  // 如果文本不存在，则使用英语作为后备
  if (!text) {
    console.error(`Key '${key}' not found for language '${lang}', falling back to English.`);
    text = i18nData['en'][key];

    // 如果英语版本也不存在，则返回键名
    if (!text) {
      console.error(`Key '${key}' not found for English either.`);
      return key;
    }
  }

  // 替换模板中的变量
  if (params) {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(`\${${paramKey}}`, params[paramKey]);
    });
  }

  return text;
}

export function smartMergeStrings(str1: string, str2: string): string {
  // If either string is empty, return the other
  if (!str1) return str2;
  if (!str2) return str1;

  // Check if one string is entirely contained within the other
  if (str1.includes(str2)) return str1;
  if (str2.includes(str1)) return str2;

  // Find the maximum possible overlap length
  const maxOverlap = Math.min(str1.length, str2.length);
  let bestOverlapLength = 0;

  // Check for overlaps starting from the largest possible
  for (let overlapLength = maxOverlap; overlapLength > 0; overlapLength--) {
    // Get the end of first string with the current overlap length
    const endOfStr1 = str1.slice(str1.length - overlapLength);
    // Get the beginning of second string with the current overlap length
    const startOfStr2 = str2.slice(0, overlapLength);

    // If they match, we've found our overlap
    if (endOfStr1 === startOfStr2) {
      bestOverlapLength = overlapLength;
      break;
    }
  }

  // Merge the strings using the best overlap
  if (bestOverlapLength > 0) {
    return str1.slice(0, str1.length - bestOverlapLength) + str2;
  } else {
    // No overlap found, concatenate normally
    return str1 + str2;
  }
}
