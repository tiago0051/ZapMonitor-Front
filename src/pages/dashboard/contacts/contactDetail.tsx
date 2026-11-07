import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { contactService } from "@/services/api/contactService";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { ContactProfile } from "./components/contactProfile";
import { ContactSequences } from "./components/contactSequences";
import { ContactTimeline } from "./components/contactTimeline";
import { contactDetailKey } from "./contactUtils";

export const ContactDetailPage = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  // Mesma chave da ficha: não busca de novo, só lê se tem e-mail
  const contactQuery = useQuery({
    queryKey: contactDetailKey(client.id, contactId!),
    queryFn: () => contactService.findOne(client.id, contactId!),
  });

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <Link to={`${baseUrl}/contacts`} className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Contatos
      </Link>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,42rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h1 className="mb-4 text-2xl font-semibold">Ficha do contato</h1>
          <ContactProfile key={contactId} contactId={contactId!} />
        </div>
        <div className="grid min-w-0 gap-6">
          {can("broadcasts.view") && <ContactSequences contactId={contactId!} hasEmail={!!contactQuery.data?.emails.length} />}
          <ContactTimeline key={contactId} contactId={contactId!} />
        </div>
      </div>
    </div>
  );
};
