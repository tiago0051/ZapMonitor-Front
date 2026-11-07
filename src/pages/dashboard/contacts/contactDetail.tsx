import { useBaseUrl } from "@/hooks/use-baseUrl";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { ContactProfile } from "./components/contactProfile";

export const ContactDetailPage = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const baseUrl = useBaseUrl();

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <Link to={`${baseUrl}/contacts`} className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Contatos
      </Link>
      <div className="w-full max-w-2xl">
        <h1 className="mb-4 text-2xl font-semibold">Ficha do contato</h1>
        <ContactProfile key={contactId} contactId={contactId!} />
      </div>
    </div>
  );
};
