import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ReactNode } from "react";
import { ErrorState } from "./state-message";

type ErrorBoundaryProps = {
  onReset: () => void;
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  retry = () => {
    this.props.onReset();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) return this.props.fallback(this.retry);
    return this.props.children;
  }
}

type QueryErrorBoundaryProps = {
  message: string;
  children: ReactNode;
  // Conteúdo extra abaixo do erro, como um link para sair da tela
  action?: ReactNode;
};

/** Mostra o erro de uma consulta com suspense no lugar da área, com "Tentar novamente", em vez de derrubar a tela inteira. */
export const QueryErrorBoundary = ({ message, children, action }: QueryErrorBoundaryProps) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        fallback={(retry) => (
          <div className="flex flex-col items-center">
            <ErrorState message={message} onRetry={retry} />
            {action}
          </div>
        )}
      >
        {children}
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
