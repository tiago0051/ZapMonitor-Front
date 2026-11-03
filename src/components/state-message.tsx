import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, Inbox, Loader2, RotateCw, type LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";

// Estados padrão de uma área que carrega dados: carregando, erro com nova tentativa e lista vazia

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export const LoadingState: FC<LoadingStateProps> = ({ label = "Carregando...", className }) => (
  <div role="status" className={cn("text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm", className)}>
    <Loader2 className="h-4 w-4 animate-spin" />
    {label}
  </div>
);

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

export const ErrorState: FC<ErrorStateProps> = ({ message, onRetry, isRetrying, className }) => (
  <div role="alert" className={cn("flex flex-col items-center justify-center gap-2 px-4 py-8 text-center", className)}>
    <AlertCircle className="text-destructive h-6 w-6" />
    <p className="text-sm font-medium">{message}</p>
    <p className="text-muted-foreground text-xs">Verifique sua conexão e tente de novo.</p>
    {onRetry && (
      <Button variant="outline" size="sm" className="mt-1" onClick={onRetry} disabled={isRetrying}>
        <RotateCw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
        Tentar novamente
      </Button>
    )}
  </div>
);

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export const EmptyState: FC<EmptyStateProps> = ({ title, description, icon: Icon = Inbox, action, className }) => (
  <div className={cn("flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center", className)}>
    <Icon className="text-muted-foreground mb-1 h-6 w-6" />
    <p className="text-sm font-medium">{title}</p>
    {description && <p className="text-muted-foreground max-w-sm text-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
