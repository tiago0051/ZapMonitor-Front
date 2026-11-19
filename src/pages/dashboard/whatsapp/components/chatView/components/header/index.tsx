import { ContactAvatar } from "@/components/contact-avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/utils/formatString";
import { ArrowLeft, ArrowRightLeft, Briefcase, Forward, Info, MoreHorizontal, Search, XCircle, UserCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { ContactDeals } from "@/pages/dashboard/crm/components/contactDeals";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, type FC } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";
import { CallButton } from "@/pages/dashboard/whatsapp/calls/callButton";
import { contactDisplayName } from "@/pages/dashboard/whatsapp/contactDisplayName";
import { EndServiceDialog } from "../endServiceDialog";
import { TransferDialog } from "../transferDialog";

interface HeaderProps {
  contact: WhatsappContactMessage;
  contactService?: WhatsappContactService;
  serviceActions: ServiceActions;
  onBack?: () => void;
  onShowInfo?: () => void;
  onSearch?: () => void;
}

export const Header: FC<HeaderProps> = ({ contact, contactService, serviceActions, onBack, onShowInfo, onSearch }) => {
  const contactName = contactDisplayName(contact, "este contato");
  const { canUseCrm } = useClientContext();
  // O diálogo de encerrar fica nas ações do atendimento: o atalho de teclado também o abre
  const { isEndDialogOpen, setIsEndDialogOpen } = serviceActions;
  const [isDealsDialogOpen, setIsDealsDialogOpen] = useState(false);

  // No celular só a ação principal fica à vista; o resto vai para o menu "⋯"
  const canEnd = !!contactService?.canBeServiceEnded;
  const canForward = !!contactService?.canBeForwarded;
  const primaryAction = serviceActions.canAssumeService ? "assume" : canEnd ? "end" : null;
  const showEndInMenu = canEnd && primaryAction !== "end";
  // Transferir só existe no menu "⋯", que então aparece também no computador
  const canTransfer = serviceActions.canTransferToOthers;
  const hasMenu = canUseCrm || canForward || showEndInMenu || canTransfer;

  return (
    <header className="bg-card border-border flex flex-shrink-0 items-center gap-1.5 border-b px-2 py-2.5 sm:gap-2 sm:px-3 sm:py-3 md:px-5">
      {/* Back button — mobile only */}
      <button
        type="button"
        aria-label="Voltar para a lista"
        className="hover:bg-muted text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <ContactAvatar contact={contact} />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">
          {contactDisplayName(contact, formatPhoneNumber(contact.phoneNumber))}
        </p>
        <p className="text-muted-foreground truncate text-xs">{formatPhoneNumber(contact.phoneNumber)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {onSearch && (
          <button
            type="button"
            aria-label="Buscar nesta conversa"
            title="Buscar nesta conversa"
            onClick={onSearch}
            className="hover:bg-muted text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
        <CallButton contact={contact} contactService={contactService} />
        {canUseCrm && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Negócios"
                className="bg-muted hover:bg-muted/70 text-foreground hidden items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:flex sm:px-3"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Negócios</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-[70dvh] w-80 overflow-y-auto">
              <p className="mb-3 text-sm font-semibold">Negócios de {contactName}</p>
              <ContactDeals contact={contact} />
            </PopoverContent>
          </Popover>
        )}
        {serviceActions.canAssumeService && (
          <button
            type="button"
            onClick={serviceActions.assumeService}
            disabled={serviceActions.isPending}
            className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 sm:px-3"
          >
            Assumir
          </button>
        )}
        {contactService?.canBeForwarded && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Encaminhar"
                disabled={serviceActions.isPending}
                className="hidden items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 sm:flex sm:px-3"
              >
                <Forward className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Encaminhar</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Próxima etapa do fluxo</DropdownMenuLabel>
              {contactService.flowOutputs.map((output) => (
                <DropdownMenuItem key={output.id} onSelect={() => serviceActions.forwardService(output.id)}>
                  {output.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canEnd && (
          <button
            type="button"
            disabled={serviceActions.isPending}
            onClick={() => setIsEndDialogOpen(true)}
            className={cn(
              "rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 sm:block sm:px-3",
              primaryAction !== "end" && "hidden",
            )}
          >
            Encerrar
          </button>
        )}
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Mais ações"
                className={cn(
                  "hover:bg-muted text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                  !canTransfer && "sm:hidden",
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {canTransfer && (
                <DropdownMenuItem disabled={serviceActions.isPending} onSelect={() => serviceActions.setIsTransferDialogOpen(true)}>
                  <ArrowRightLeft className="h-4 w-4" />
                  Transferir
                </DropdownMenuItem>
              )}
              {canUseCrm && (
                <DropdownMenuItem className="sm:hidden" onSelect={() => setIsDealsDialogOpen(true)}>
                  <Briefcase className="h-4 w-4" />
                  Negócios
                </DropdownMenuItem>
              )}
              {canForward && contactService && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={serviceActions.isPending} className="gap-2 sm:hidden">
                    <Forward className="text-muted-foreground h-4 w-4" />
                    Encaminhar
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel>Próxima etapa do fluxo</DropdownMenuLabel>
                    {contactService.flowOutputs.map((output) => (
                      <DropdownMenuItem key={output.id} onSelect={() => serviceActions.forwardService(output.id)}>
                        {output.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {serviceActions.canAssumeService && primaryAction !== "assume" && (
                <DropdownMenuItem disabled={serviceActions.isPending} onSelect={serviceActions.assumeService}>
                  <UserCheck className="h-4 w-4" />
                  Assumir
                </DropdownMenuItem>
              )}
              {showEndInMenu && (
                <DropdownMenuItem
                  variant="destructive"
                  className="sm:hidden"
                  disabled={serviceActions.isPending}
                  onSelect={() => setIsEndDialogOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Encerrar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canEnd && (
          <EndServiceDialog
            open={isEndDialogOpen}
            onOpenChange={setIsEndDialogOpen}
            contactName={contactName}
            onConfirm={serviceActions.endService}
          />
        )}
        {canTransfer && <TransferDialog contact={contact} contactName={contactName} serviceActions={serviceActions} />}
        {canUseCrm && (
          <Dialog open={isDealsDialogOpen} onOpenChange={setIsDealsDialogOpen}>
            <DialogContent className="max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Negócios de {contactName}</DialogTitle>
              </DialogHeader>
              <ContactDeals contact={contact} />
            </DialogContent>
          </Dialog>
        )}
        {/* Info button — mobile only */}
        <button
          type="button"
          aria-label="Informações do contato"
          className="hover:bg-muted text-muted-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
          onClick={onShowInfo}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
