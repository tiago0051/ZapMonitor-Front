import { ContactAvatar } from "@/components/contact-avatar";
import { formatPhoneNumber } from "@/utils/formatString";
import { ArrowLeft, Info, MoreHorizontal } from "lucide-react";
import type { FC } from "react";

interface HeaderProps {
  contact: WhatsappContactMessage;
}

export const Header: FC<HeaderProps> = ({ contact }) => {
  return (
    <header className="bg-card border-border flex flex-shrink-0 items-center gap-2 border-b px-3 py-3 md:px-5">
      {/* Back button — mobile only */}
      <button
        className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
        // onClick={() => setMobileView("list")}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <ContactAvatar contact={contact} />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">{contact.name}</p>
        <p className="text-muted-foreground text-xs">{formatPhoneNumber(contact.phoneNumber)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button className="hidden rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 sm:block">
          Assumir
        </button>
        <button className="hidden rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 sm:block">
          Encerrar
        </button>
        {/* Info button — mobile only */}
        <button
          className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors md:hidden"
          //   onClick={() => setMobileView("info")}
        >
          <Info className="h-4 w-4" />
        </button>
        <button className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
