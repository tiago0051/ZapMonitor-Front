export const complianceFieldLabel: Record<AdComplianceField, string> = {
  headline: "Título",
  primaryText: "Texto principal",
  description: "Descrição",
  welcomeMessage: "Mensagem de boas-vindas",
  specialAdCategory: "Categoria especial",
};

/** Id do bloco do anúncio no editor do plano, para a revisão de políticas levar até ele. */
export const planCreativeElementId = (creativeKey: string) => `plan-creative-${creativeKey}`;

// Campo de categoria especial no editor do plano
export const PLAN_CATEGORY_ELEMENT_ID = "plan-category";

/** Rola até o anúncio (ou a categoria) do problema e foca o campo, selecionando o trecho quando ele aparece no texto. */
export const focusComplianceIssue = (issue: AdComplianceIssue) => {
  const field =
    issue.field === "specialAdCategory"
      ? document.getElementById(PLAN_CATEGORY_ELEMENT_ID)
      : issue.creativeKey
        ? (document
            .getElementById(planCreativeElementId(issue.creativeKey))
            ?.querySelector<HTMLElement>(issue.field ? `[data-compliance-field="${issue.field}"]` : "input, textarea") ?? null)
        : null;
  const target = field ?? (issue.creativeKey ? document.getElementById(planCreativeElementId(issue.creativeKey)) : null);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  if (!field) return;
  field.focus({ preventScroll: true });
  if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && issue.excerpt) {
    const start = field.value.toLowerCase().indexOf(issue.excerpt.toLowerCase());
    if (start >= 0) field.setSelectionRange(start, start + issue.excerpt.length);
  }
};
