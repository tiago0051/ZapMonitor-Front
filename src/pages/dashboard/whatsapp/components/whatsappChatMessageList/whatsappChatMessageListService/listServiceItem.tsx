import { formatBoldText, formatShortId } from "@/utils/formatString";
import { useState } from "react";
import { ChevronDown, ChevronRight, Bot } from "lucide-react";
import { useClientContext } from "@/context/ClientContext/clientContext";

interface ListServiceItemProps {
  service: WhatsappServiceHistory;
}

export const ListServiceItem: React.FC<ListServiceItemProps> = ({ service }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { client } = useClientContext();

  return (
    <li className="mb-4 rounded border p-2">
      <div
        className="hover:bg-muted/50 -m-1 mb-2 flex cursor-pointer items-center justify-between rounded p-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <p className="text-sm">Protocolo: {formatShortId(service.id)}</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            service.finished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {service.finished ? "Finalizado" : "Em andamento"}
        </span>
      </div>
      {isExpanded && (
        <div className="mt-2 flex flex-col-reverse gap-2">
          {service.actions.map((action) => (
            <div
              key={action.id}
              data-type={action.type}
              className="rounded border p-2 data-[type='1']:bg-blue-50 data-[type='2']:bg-yellow-50 data-[type='3']:bg-green-50"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-foreground/50 text-sm">{new Date(action.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm">{action.annotation}</p>
            </div>
          ))}
          {client?.hasAiConfig && service.aiResume && (
            <div className="border-primary/20 bg-primary/5 rounded border p-3">
              <div className="text-primary mb-2 flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4" />
                <span className="text-sm">Resumo da IA</span>
              </div>
              <pre className="text-foreground/80 font-sans text-sm whitespace-pre-wrap">{formatBoldText(service.aiResume)}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
};
