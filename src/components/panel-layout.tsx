import { Button } from "@/components/ui/button";
import { useUserContext } from "@/context/UserContext/userContext";
import { FiBriefcase, FiGrid, FiLogOut, FiTrendingUp } from "react-icons/fi";
import { Link, Outlet } from "react-router";

/** Layout das áreas que ficam fora de um tenant: painel do implantador e tela do dono. */
export const PanelLayout = () => {
  const { logout, user } = useUserContext();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-secondary flex h-14 items-center justify-between gap-2 px-4">
        <Link to="/auth/select_client" className="flex items-center gap-2">
          <p className="bg-foreground rounded-sm px-2 text-2xl font-bold text-white">
            Zap<span className="text-primary">Monitor</span>
          </p>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/select_client">
              <FiGrid />
              <span className="hidden sm:inline">Meus clientes</span>
            </Link>
          </Button>
          {user?.isImplanter && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/implanter">
                <FiBriefcase />
                <span className="hidden sm:inline">Implantador</span>
              </Link>
            </Button>
          )}
          {user?.isOwner && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/owner">
                <FiTrendingUp />
                <span className="hidden sm:inline">Dono</span>
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild onClick={() => logout()}>
            <Link to="/auth/logout">
              <FiLogOut />
              <span className="hidden sm:inline">Sair</span>
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
