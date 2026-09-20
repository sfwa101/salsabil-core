/**
 * قاعدة ESLint مخصَّصة: تمنع استخدام كلاسات ألوان Tailwind الحرفية (bg-white، bg-emerald-600،
 * text-black، border-gray-300 ...) وتفرض استخدام توكنز نظام التصميم الدلالية فقط (bg-primary،
 * text-foreground، border-border ...) المعرَّفة عبر متغيرات الثيم في src/app/globals.css
 * (@theme inline → --sb-*). راجع docs/UI_UX_SYSTEM.md §8 وADR-007/ADR-025.
 *
 * تُطابق الكلاس بعد تجريد المُحدِّدات (dark:, hover:, sm: ...) ومُعدِّل الشفافية (/50) وعلامة
 * "!important" (!bg-white)، ضد لوحة ألوان Tailwind القياسية الكاملة + black/white.
 *
 * نطاق الفحص: أي string literal أو نص ثابت داخل template literal يقع فعلياً ضمن سياق كلاس CSS —
 * إما قيمة مباشرة لـ className/class على عنصر JSX، أو وسيط لدالة دمج كلاسات معروفة (cn/clsx/cva/
 * classnames/twMerge/tw)، مع تتبُّع عبر التعبيرات الشرطية/المصفوفات/الكائنات المتداخلة. لا يتتبّع
 * قيماً معرَّفة في متغيّر منفصل خارج هذا السياق (قيد معروف لأي قاعدة تعتمد على تحليل ساكن للأنماط).
 */

const COLOR_NAMES = [
  'slate', 'gray', 'grey', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'ring-offset', 'divide', 'outline', 'decoration',
  'accent', 'caret', 'fill', 'stroke', 'from', 'via', 'to', 'shadow', 'placeholder',
  'selection',
];

const SHADE_RE = '(?:50|100|200|300|400|500|600|700|800|900|950)';

const SCALE_COLOR_RE = new RegExp(
  `^(?:${COLOR_PREFIXES.join('|')})-(?:${COLOR_NAMES.join('|')})-${SHADE_RE}$`,
);
const MONO_COLOR_RE = new RegExp(`^(?:${COLOR_PREFIXES.join('|')})-(?:black|white)$`);

const CLASS_HELPER_NAMES = new Set(['cn', 'clsx', 'classnames', 'cva', 'twMerge', 'tw']);

const PROPAGATING_TYPES = new Set([
  'JSXExpressionContainer',
  'TemplateLiteral',
  'ArrayExpression',
  'ObjectExpression',
  'Property',
  'LogicalExpression',
  'ConditionalExpression',
  'BinaryExpression',
  'SpreadElement',
]);

function isClassNameAttribute(node) {
  return (
    node.type === 'JSXAttribute' &&
    node.name.type === 'JSXIdentifier' &&
    (node.name.name === 'className' || node.name.name === 'class')
  );
}

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return null;
}

/** يتحقق من أن node يقع فعلياً ضمن سياق نص كلاسات (className JSX أو دالة دمج كلاسات معروفة). */
function isInClassNameContext(node) {
  let current = node.parent;
  while (current) {
    if (isClassNameAttribute(current)) return true;
    if (current.type === 'CallExpression') {
      const name = calleeName(current.callee);
      return Boolean(name && CLASS_HELPER_NAMES.has(name));
    }
    if (PROPAGATING_TYPES.has(current.type)) {
      current = current.parent;
      continue;
    }
    return false;
  }
  return false;
}

function extractOffendingClass(token) {
  const withoutImportant = token.startsWith('!') ? token.slice(1) : token;
  const parts = withoutImportant.split(':');
  const base = parts[parts.length - 1];
  const withoutOpacity = base.split('/')[0];
  if (SCALE_COLOR_RE.test(withoutOpacity) || MONO_COLOR_RE.test(withoutOpacity)) {
    return token;
  }
  return null;
}

function checkClassString(text, node, context) {
  const tokens = text.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const offending = extractOffendingClass(token);
    if (!offending) continue;

    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const raw = sourceCode.getText(node);
    const indexInRaw = raw.indexOf(offending);
    let reportLoc;
    if (indexInRaw !== -1) {
      const start = node.range[0] + indexInRaw;
      const end = start + offending.length;
      reportLoc = {
        start: sourceCode.getLocFromIndex(start),
        end: sourceCode.getLocFromIndex(end),
      };
    }

    context.report({
      node,
      loc: reportLoc,
      message:
        'كلاس لون Tailwind حرفي ممنوع: "{{offending}}" — استخدم توكنز نظام التصميم الدلالية فقط ' +
        '(مثل bg-primary/text-foreground/border-border/bg-muted...، راجع src/app/globals.css).',
      data: { offending },
    });
  }
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'يمنع كلاسات ألوان Tailwind الحرفية (bg-white، bg-emerald-600 ...) خارج توكنز نظام التصميم.',
    },
    schema: [],
    messages: {},
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!isInClassNameContext(node)) return;
        checkClassString(node.value, node, context);
      },
      TemplateElement(node) {
        const raw = node.value.raw;
        if (!raw || !raw.trim()) return;
        const templateLiteral = node.parent;
        if (!isInClassNameContext(templateLiteral)) return;
        checkClassString(raw, node, context);
      },
    };
  },
};
