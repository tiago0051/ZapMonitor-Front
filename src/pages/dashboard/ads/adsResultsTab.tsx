import { useState, type FC } from "react";
import { AdsDailySummary } from "./adsDailySummary";
import { AdsPlatformComparison } from "./adsPlatformComparison";
import { AdsResults } from "./adsResults";
import { addDaysToDate, todayInTimeZone } from "./adsUtils";
import { AdsPeriodPicker, type AdsPeriod } from "./components/adsPeriodPicker";

/** Aba Resultados: um período só, no fuso da conta, alimenta a comparação entre plataformas, o resumo do dia e o relatório. */
export const AdsResultsTab: FC<{ account: AdAccount; showPlatformComparison: boolean }> = ({ account, showPlatformComparison }) => {
  const today = todayInTimeZone(account.timezoneName);
  const [period, setPeriod] = useState<AdsPeriod>(() => ({ startDate: addDaysToDate(today, -29), endDate: today }));

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <AdsPeriodPicker period={period} today={today} onChange={setPeriod} />
        <span className="text-muted-foreground text-xs">Datas no fuso da conta</span>
      </div>
      {showPlatformComparison && <AdsPlatformComparison period={period} />}
      <AdsDailySummary account={account} endDate={period.endDate} />
      <AdsResults account={account} period={period} />
    </>
  );
};
