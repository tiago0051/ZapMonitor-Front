import { useMemo, useState, type FC } from "react";
import { WhatsappContext } from "./whatsappContext";

type WhatsappProviderProps = {
  children: React.ReactNode;
};

export const WhatsappProvider: FC<WhatsappProviderProps> = ({ children }) => {
  const [contactSelected, setContactSelected] = useState<WhatsappContactMessage | null>(null);

  const newMessageAudio = useMemo(() => new Audio("/assets/whatsapp/chat/sounds/new-message.mp3"), []);

  function playSound() {
    newMessageAudio.play();
  }

  return (
    <WhatsappContext.Provider
      value={{
        contactSelected,
        hasContactSelected: !!contactSelected,
        setContactSelected,
        playSound,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
};
