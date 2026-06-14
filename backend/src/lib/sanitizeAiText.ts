/** Strip em/en dashes and quotation marks from AI-generated form values. */
export function sanitizeAiText(text: string): string {
  if (!text) return text;

  return text
    .replace(/[\u2014\u2013—–]/g, ", ")
    .replace(/[""„«»]/g, "")
    .replace(/"/g, "")
    .replace(/,(\s*,)+/g, ", ")
    .replace(/[ \t]+/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

export const AI_WRITING_STYLE_RULES = `WRITING STYLE (required for all text values):
- Never use em dashes, en dashes, or dashes as sentence punctuation
- Never use quotation marks of any kind in output values
- Use plain prose with commas and periods only`;
