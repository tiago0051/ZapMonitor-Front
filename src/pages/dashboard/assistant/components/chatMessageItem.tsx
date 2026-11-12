import { SimpleMarkdown } from "@/pages/dashboard/ads/wiki/simpleMarkdown";
import { format } from "date-fns";
import { ChevronRight, Search } from "lucide-react";
import type { FC } from "react";
import { PlanCard } from "./planCard";

const previewInput = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && Object.keys(value).length === 0) return null;
  const text = JSON.stringify(value);
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
};

const ToolCallList: FC<{ calls: AssistantToolCall[]; toolDescriptions: Map<string, string> }> = ({ calls, toolDescriptions }) => (
  <details className="group">
    <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs select-none [&::-webkit-details-marker]:hidden">
      <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
      <Search className="h-3 w-3" />O que o assistente consultou ({calls.length})
    </summary>
    <ul className="mt-1.5 grid gap-1 border-l pl-3">
      {calls.map((call, index) => {
        const input = previewInput(call.entrada);
        return (
          <li key={index} className="text-xs">
            <span className="font-medium">{toolDescriptions.get(call.nome) ?? call.nome}</span>
            {input && <code className="text-muted-foreground block font-mono text-[11px] break-all">{input}</code>}
          </li>
        );
      })}
    </ul>
  </details>
);

type ChatMessageItemProps = {
  message: AssistantMessage;
  plan?: AssistantPlan;
  toolDescriptions: Map<string, string>;
  highlightedPlanId?: string | null;
};

export const ChatMessageItem: FC<ChatMessageItemProps> = ({ message, plan, toolDescriptions, highlightedPlanId }) => {
  if (message.role === "USER") return <UserBubble text={message.content} />;

  return (
    <div className="grid max-w-full min-w-0 gap-2 sm:max-w-[95%]">
      {message.content && (
        <div className="bg-muted/50 min-w-0 rounded-lg px-3 py-2 break-words">
          <SimpleMarkdown markdown={message.content} />
        </div>
      )}
      {message.toolCalls && message.toolCalls.length > 0 && <ToolCallList calls={message.toolCalls} toolDescriptions={toolDescriptions} />}
      {plan && <PlanCard plan={plan} highlighted={plan.id === highlightedPlanId} />}
      <p className="text-muted-foreground text-[11px]">{format(new Date(message.createdAt), "dd/MM HH:mm")}</p>
    </div>
  );
};

export const UserBubble: FC<{ text: string }> = ({ text }) => (
  <div className="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap">
    {text}
  </div>
);
