import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { isStaleVersionError } from "@/utils/staleVersion";
import { ErrorState } from "./state-message";

type ErrorBoundaryProps = {
  onReset: () => void;
  fallback: (retry: () => void, error: unknown) => ReactNode;
  children: ReactNode;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean; error: unknown }> {
  state = { hasError: false, error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Fica no console (e nas gravações do Clarity) para saber o que derrubou a tela
    console.error("Erro na tela:", error, info.componentStack);
  }

  retry = () => {
    this.props.onReset();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) return this.props.fallback(this.retry, this.state.error);
    return this.props.children;
  }
}

type QueryErrorBoundaryProps = {
  message: string;
  children: ReactNode;
  // Conteúdo extra abaixo do erro, como um link para sair da tela
  action?: ReactNode;
  // Tela própria para um erro conhecido (ex.: plano vencido); nulo usa a mensagem padrão
  renderError?: (error: unknown) => ReactNode | null;
};

/** Mostra o erro de uma consulta com suspense no lugar da área, com "Tentar novamente", em vez de derrubar a tela inteira. */
export const QueryErrorBoundary = ({ message, children, action, renderError }: QueryErrorBoundaryProps) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        fallback={(retry, error) =>
          renderError?.(error) ??
          (isStaleVersionError(error) ? (
            // Aba aberta durante uma atualização do sistema: "tentar de novo" não resolve, só recarregar
            <div className="flex flex-col items-center">
              <ErrorState
                message="O sistema foi atualizado. Recarregue a página para continuar."
                onRetry={() => window.location.reload()}
                retryLabel="Recarregar"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ErrorState message={message} onRetry={retry} />
              {action}
            </div>
          ))
        }
      >
        {children}
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
