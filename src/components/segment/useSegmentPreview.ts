import { useClientContext } from "@/context/ClientContext/clientContext";
import { segmentService } from "@/services/api/segmentService";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { segmentRulesError } from "./segmentUtils";

/** Contagem do segmento no servidor, com espera entre as mudanças; telas e o seletor dividem o mesmo cache. */
export const useSegmentPreview = (rules: SegmentRules | null, enabled = true) => {
  const { client, can } = useClientContext();
  const [debounced] = useDebounceValue(rules, 600);

  return useQuery({
    queryKey: ["segments", client.id, "preview", debounced],
    queryFn: () => segmentService.preview(client.id, { rules: debounced! }),
    enabled: enabled && can("broadcasts.send") && !!debounced && !segmentRulesError(debounced),
    placeholderData: keepPreviousData,
  });
};
