// Campos de lista do perfil da marca, um item por linha no formulário
export const profileListFields: { key: keyof AdBrandProfileData; label: string }[] = [
  { key: "products", label: "Produtos" },
  { key: "differentiators", label: "Diferenciais" },
  { key: "offers", label: "Ofertas" },
  { key: "proofs", label: "Provas" },
  { key: "restrictions", label: "Restrições (o que não pode prometer)" },
  { key: "avoidWords", label: "Palavras a evitar" },
];

export const emptyBrandProfile = (): AdBrandProfileData => ({
  business: "",
  products: [],
  audience: "",
  differentiators: [],
  offers: [],
  proofs: [],
  tone: "",
  restrictions: [],
  avoidWords: [],
  summary: "",
});
