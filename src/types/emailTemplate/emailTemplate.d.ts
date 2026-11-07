type EmailBlockAlign = "left" | "center" | "right";

type EmailHeadingBlock = { id: string; type: "heading"; text: string; align: EmailBlockAlign; level: 1 | 2 };
// Texto com quebras de linha, **negrito**, _itálico_ e [link](https://...)
type EmailTextBlock = { id: string; type: "text"; text: string; align: EmailBlockAlign };
// Largura em porcentagem da área do e-mail
type EmailImageBlock = { id: string; type: "image"; url: string; alt: string; link: string | null; width: number; align: EmailBlockAlign };
type EmailButtonBlock = { id: string; type: "button"; text: string; url: string; align: EmailBlockAlign; color: string | null };
type EmailDividerBlock = { id: string; type: "divider" };
type EmailSpacerBlock = { id: string; type: "spacer"; height: number };
type EmailColumnBlock = EmailHeadingBlock | EmailTextBlock | EmailImageBlock | EmailButtonBlock;
type EmailColumnsBlock = { id: string; type: "columns"; columns: [EmailColumnBlock[], EmailColumnBlock[]] };
type EmailSocialNetwork = "instagram" | "facebook" | "linkedin" | "whatsapp" | "youtube" | "site";
type EmailSocialBlock = { id: string; type: "social"; links: { network: EmailSocialNetwork; url: string }[]; align: EmailBlockAlign };

type EmailBlock =
  | EmailHeadingBlock
  | EmailTextBlock
  | EmailImageBlock
  | EmailButtonBlock
  | EmailDividerBlock
  | EmailSpacerBlock
  | EmailColumnsBlock
  | EmailSocialBlock;

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  blocks: EmailBlock[];
  createdAt: string;
  updatedAt: string;
};

type EmailTemplateSummary = { id: string; name: string; subject: string; updatedAt: string };

type EmailTemplateStarter = { key: string; name: string; description: string };

type EmailTemplateVariable = { key: string; label: string };

type EmailBrand = {
  logoAssetId: string | null;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  // Nome, CNPJ e endereço da empresa
  footerText: string | null;
};
