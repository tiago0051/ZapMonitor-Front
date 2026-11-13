type FindWhatsappPerformanceRequestData = {
  params: { clientId: string };
  queries: {
    startDate: string;
    endDate: string;
    // Date.getTimezoneOffset() do navegador: dias e horas do relatório no horário local
    timezoneOffset: number;
  };
};
