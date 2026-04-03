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
    <>
      <Header title="Lista de contatos" />
      <div className={"space-y-6"}>
        <WhatsappContactFilters
          filterCategories={filterCategories}
          onChangeFilterCategories={setFilterCategories}
          onChangeFilterText={setFilterText}
        />
        <div className="overflow-x-auto">
          <WhatsappKanban filterCategories={filterCategories} filterText={filterText} />
        </div>
      </div>

      {hasContactSelected && <DialogWhatsappChat contactMessage={contactSelected!} />}
    </>
  );
};
