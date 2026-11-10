import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, ChevronDown, ChevronRight, FlaskConical, Sparkles } from "lucide-react";
import { useState, type FC } from "react";
import { diaryQueryKey } from "../experiments/experimentsUtils";

const kindInfo: Record<AdLearningEntryKind, { label: string; icon: typeof FlaskConical; className: string }> = {
  EXPERIMENT: { label: "Teste", icon: FlaskConical, className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  TRAIT: { label: "Criativos", icon: Sparkles, className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
};

const DiaryItem: FC<{ entry: AdLearningEntry }> = ({ entry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const kind = kindInfo[entry.kind];
  const Icon = kind.icon;

  return (
    <li className="relative">
      <span className={cn("absolute top-0.5 -left-6 flex h-4 w-4 items-center justify-center rounded-full", kind.className)}>
        <Icon className="h-2.5 w-2.5" />
      </span>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-start gap-1 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            {format(new Date(entry.createdAt), "dd/MM/yyyy")}
            <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", kind.className)}>{kind.label}</span>
          </span>
          <span className="block text-sm font-medium break-words">{entry.title}</span>
        </span>
        {isOpen ? <ChevronDown className="mt-1 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0" />}
      </button>
      {isOpen && <p className="text-muted-foreground mt-1 text-sm break-words whitespace-pre-line">{entry.detail}</p>}
    </li>
  );
};

/** Linha do tempo do que a conta aprendeu: testes que acabaram e características que passaram a vender mais ou menos. */
export const LearningDiary: FC<{ account: AdAccount }> = ({ account }) => {
  const { client } = useClientContext();
  const diaryQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: diaryQueryKey(client.id, account.id),
    queryFn: () => metaAdsService.findLearningDiary({ params: { clientId: client.id, accountId: account.id } }),
  });
  const entries = diaryQuery.data ?? [];

  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <BookOpen className="text-primary h-4 w-4" />
          Diário de aprendizados
        </h3>
        <p className="text-muted-foreground text-sm">O que ficou provado na sua conta, do mais recente para o mais antigo.</p>
      </div>
      {diaryQuery.isLoading ? (
        <LoadingState />
      ) : diaryQuery.isError ? (
        <ErrorState message="Não foi possível carregar o diário." onRetry={() => diaryQuery.refetch()} isRetrying={diaryQuery.isFetching} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum aprendizado registrado ainda"
          description="As anotações aparecem aqui quando um teste termina ou quando uma característica dos criativos passa a vender mais ou menos."
        />
      ) : (
        <ol className="border-muted ml-2 space-y-4 border-l pl-4">
          {entries.map((entry) => (
            <DiaryItem key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  );
};
