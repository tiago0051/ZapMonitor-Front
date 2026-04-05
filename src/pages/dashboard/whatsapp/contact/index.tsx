import { WhatsappKanban } from "./whatsappKanban";
import { Header } from "@/components/ui/header";
import { useDebounceValue } from "usehooks-ts";
import { globalContants } from "@/contants/globalContants";
import { useState } from "react";
import { WhatsappContactFilters } from "./whatsappContactFilters";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";
import { DialogWhatsappChat } from "./dialogWhatsappChat";

export const WhatsappContacts = () => {
  const { contactSelected, hasContactSelected } = useWhatsappContext();

  const [filterCategories, setFilterCategories] = useState<WhatsappMessageCategory[]>([]);
  const [filterText, setFilterText] = useDebounceValue("", globalContants.DEBOUNCE_DELAY);

  return (
    <div className="mx-auto space-y-8">
      <Header title="Lista de contatos" />
      <WhatsappContactFilters
        filterCategories={filterCategories}
        onChangeFilterCategories={setFilterCategories}
        onChangeFilterText={setFilterText}
      />
      <div className="overflow-x-auto">
        <WhatsappKanban filterCategories={filterCategories} filterText={filterText} />
      </div>

      {hasContactSelected && <DialogWhatsappChat contactMessage={contactSelected!} />}
    </div>
  );
};
