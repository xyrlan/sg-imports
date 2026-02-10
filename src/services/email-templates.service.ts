import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Template variables that can be replaced in email templates
 */
export interface EmailTemplateVariables {
  fullName?: string;
  email?: string;
  role?: string;
  year?: string;
  [key: string]: string | undefined;
}

/**
 * Available email template names
 * Note: Authentication emails (verify-email, reset-password) are handled by Supabase
 */
export type EmailTemplateName = 'welcome-email' | 'notification';

/**
 * Render an email template by replacing placeholders with actual values
 * @param templateName - Name of the template file (without .html extension)
 * @param variables - Object containing variable values to replace in template
 * @returns Rendered HTML string
 */
export function renderEmailTemplate(
  templateName: EmailTemplateName,
  variables: EmailTemplateVariables
): string {
  try {
    // Read template file from templates/emails directory
    const templatePath = join(process.cwd(), 'src', 'templates', 'emails', `${templateName}.html`);
    let htmlContent = readFileSync(templatePath, 'utf-8');

    // Replace all placeholders {{variableName}} with actual values
    Object.keys(variables).forEach((key) => {
      const value = variables[key] || '';
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(placeholder, value);
    });

    return htmlContent;
  } catch (error) {
    console.error(`❌ Failed to render email template "${templateName}":`, error);
    throw new Error(`Failed to render email template: ${templateName}`);
  }
}

/**
 * Helper function to get role-specific content for welcome emails
 * @param role - User role (OWNER, SELLER, etc.)
 * @returns Role-specific welcome message
 */
export function getRoleWelcomeMessage(role: string): string {
  switch (role.toUpperCase()) {
    case 'OWNER':
      return 'Agora você pode começar a gerenciar suas importações com facilidade.';
    case 'SELLER':
      return 'Agora você pode começar a vender seus produtos no marketplace.';
    default:
      return 'Agora você tem acesso ao sistema SoulGlobal.';
  }
}
