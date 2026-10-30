type WhatsappContactService = {
  id: string;
  phoneNumber: string;
  name: string;
  surname: string;
  canBeServiceTransferred: boolean;
  canBeServiceEnded: boolean;
  canBeSentMessage: boolean;
  canBeServiceStarted: boolean;
  isInService: boolean;
  canBeForwarded: boolean;
  flowOutputs: { id: string; label: string }[];
};
