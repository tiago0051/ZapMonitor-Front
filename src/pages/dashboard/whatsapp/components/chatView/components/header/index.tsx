import { ContactAvatar } from "@/components/contact-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { formatPhoneNumber } from "@/utils/formatString";
import { ArrowLeft, Briefcase, Forward, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { ContactDeals } from "@/pages/dashboard/crm/components/contactDeals";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FC } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";

interface HeaderProps {
  contact: WhatsappContactMessage;
  contactService?: WhatsappContactService;
  serviceActions: ServiceActions;
  onBack?: () => void;
  onShowInfo?: () => void;
}

export const Header: FC<HeaderProps> = ({ contact, contactService, serviceActions, onBack, onShowInfo }) => {
  const contactName = contact.surname?.trim() || contact.name?.trim() || "este contato";
  const { canUseCrm } = useClientContext();

  return (
    <header className="bg-card border-border flex flex-shrink-0 items-center gap-1.5 border-b px-2 py-2.5 sm:gap-2 sm:px-3 sm:py-3 md:px-5">
      {/* Back button — mobile only */}
      <button
        className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <ContactAvatar contact={contact} />
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">{contact.name}</p>
        <p className="text-muted-foreground text-xs">{formatPhoneNumber(contact.phoneNumber)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {canUseCrm && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="bg-muted hover:bg-muted/70 text-foreground flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-3">
                <Briefcase className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Negócios</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
              <p className="mb-3 text-sm font-semibold">Negócios de {contactName}</p>
              <ContactDeals contact={contact} />
            </PopoverContent>
          </Popover>
        )}
        {serviceActions.canAssumeService && (
          <button
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
                disabled={serviceActions.isPending}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50 sm:px-3"
              >
                <Forward className="h-3.5 w-3.5" />
                Encaminhar
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
        {contactService?.canBeServiceEnded && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={serviceActions.isPending}
                className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium whitespace-nowrap text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 sm:px-3"
              >
                Encerrar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar atendimento?</AlertDialogTitle>
                <AlertDialogDescription>
                  O atendimento de {contactName} será finalizado. Para responder de novo, será preciso assumir o atendimento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={serviceActions.endService}>
                  Encerrar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {/* Info button — mobile only */}
        <button
          className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
          onClick={onShowInfo}
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
