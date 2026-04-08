import type { FC } from "react";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Reports } from "./reports/reports";
import { MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router";

export const HomePage: FC = () => {
  const navigate = useNavigate();
  const baseUrl = useBaseUrl();
  return (
    <div className="mx-auto size-full max-w-7xl overflow-auto">
      <div className="mx-auto space-y-8">
        {/* Seção de Atalhos Rápidos */}
        <div>
          <h2 className="mb-4 text-2xl">Atalhos Rápidos</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => {
                navigate(`${baseUrl}/whatsapp`);
              }}
              className="flex items-center gap-3 rounded-lg bg-green-600 px-6 py-4 text-white shadow-lg transition-colors duration-200 hover:bg-green-700"
            >
              <MessageCircle size={24} />
              <span className="text-lg">Atendimento WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Divisor */}
        <Separator />

        {/* Seção de Dashboard */}
        <Reports />
      </div>
    </div>
  );
};
