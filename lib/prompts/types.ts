/**
 * Core prompt system types and utilities
 */

export type PromptTemplate = {
  version: string;
  template: string;
  variables: string[];
  createdAt: string;
  description: string;
};

/**
 * Builds a prompt by replacing {{variableName}} placeholders with context values.
 * @param template - The prompt template
 * @param context - Object with values to substitute
 * @returns The built prompt string
 */
export function buildPrompt(template: PromptTemplate, context: Record<string, any>): string {
  let result = template.template;

  // Replace all {{variableName}} with context values
  for (const variable of template.variables) {
    const placeholder = `{{${variable}}}`;
    const value = context[variable] ?? "";
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), String(value));
  }

  return result;
}
