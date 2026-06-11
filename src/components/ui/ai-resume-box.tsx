import { cn } from "@/lib/utils";
import { formatBoldText } from "@/utils/formatString";
import { Bot } from "lucide-react";

interface AiResumeBoxProps {
  aiResume: string;
  title: string;
  className?: string;
}

export const AiResumeBox = ({ aiResume, title, className }: AiResumeBoxProps) => {
  return (
    <div className={cn("border-primary/20 bg-primary/5 overflow-auto rounded border p-2", className)}>
      <div className="text-primary mb-2 flex items-center gap-2 font-medium">
        <Bot className="h-4 w-4" />
        <span className="text-sm">{title}</span>
      </div>
      <pre className="text-foreground/80 font-sans text-sm hyphens-auto whitespace-pre-wrap">{formatBoldText(aiResume)}</pre>
    </div>
  );
};
