import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileCheck } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { translateAiIntegrationError } from "../aiIntegrationUtils";
import { useAiIntegrationMutations } from "../useAiIntegrationMutations";
import { ConnectionTestResult } from "./connectionTestResult";
import { GoogleCalendarHelp } from "./googleCalendarHelp";

export type AiIntegrationFormDialogProps = {
  clientId: string;
  provider: AiIntegrationProvider;
  integration?: AiIntegration;
};

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const DEFAULT_LOOK_AHEAD_DAYS = 60;

const schema = z.object({
  calendarId: z.string().trim().min(1, "O ID da agenda é obrigatório"),
  timeZone: z.string().min(1, "Selecione o fuso horário"),
  lookAheadDays: z
    .number({ error: "Informe a quantidade de dias" })
    .int("Informe um número inteiro")
    .min(1, "Mínimo de 1 dia")
    .max(365, "Máximo de 365 dias"),
});

type SchemaType = z.infer<typeof schema>;

type ServiceAccountCredential = {
  data: Record<string, unknown>;
  clientEmail: string;
  fileName: string;
};

const getSettingDefault = <T,>(provider: AiIntegrationProvider, key: string, fallback: T): T => {
  const value = provider.settingsSchema?.properties?.[key]?.default;
  return value === undefined ? fallback : (value as T);
};

const getTimeZones = (): string[] => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [DEFAULT_TIME_ZONE];
  }
};

export const DialogGoogleCalendarIntegration: FC<AiIntegrationFormDialogProps> = ({ clientId, provider, integration }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [step, setStep] = useState<"form" | "result">("form");
  const [credential, setCredential] = useState<ServiceAccountCredential | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [isReplacingCredential, setIsReplacingCredential] = useState<boolean>(false);
  const [formError, setFormError] = useState<{ message: string; detail?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upsert, test, toggle } = useAiIntegrationMutations(clientId, provider.key);

  const isEditing = !!integration?.hasCredentials;
  const showCredentialUpload = !isEditing || isReplacingCredential;

  const getDefaultValues = (): SchemaType => ({
    calendarId: (integration?.settings?.calendarId as string | undefined) ?? "",
    timeZone: (integration?.settings?.timeZone as string | undefined) ?? getSettingDefault(provider, "timeZone", DEFAULT_TIME_ZONE),
    lookAheadDays:
      (integration?.settings?.lookAheadDays as number | undefined) ?? getSettingDefault(provider, "lookAheadDays", DEFAULT_LOOK_AHEAD_DAYS),
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(),
    disabled: upsert.isPending,
  });

  const savedTimeZone = integration?.settings?.timeZone as string | undefined;
  const timeZones = useMemo(() => {
    const list = getTimeZones();
    return savedTimeZone && !list.includes(savedTimeZone) ? [savedTimeZone, ...list] : list;
  }, [savedTimeZone]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      form.reset(getDefaultValues());
      setStep("form");
      setCredential(null);
      setCredentialError(null);
      setIsReplacingCredential(false);
      setFormError(null);
      upsert.reset();
      test.reset();
    }
    setIsOpen(open);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCredential(null);
    setCredentialError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setCredentialError("O arquivo selecionado não é um JSON válido.");
      return;
    }

    const data = parsed as Record<string, unknown> | null;
    if (
      !data ||
      data.type !== "service_account" ||
      typeof data.client_email !== "string" ||
      !data.client_email ||
      typeof data.private_key !== "string" ||
      !data.private_key
    ) {
      setCredentialError("O arquivo enviado não é uma chave de service account válida.");
      return;
    }

    setCredential({ data, clientEmail: data.client_email, fileName: file.name });
  };

  const handleSubmit: SubmitHandler<SchemaType> = async (values) => {
    setFormError(null);

    if (showCredentialUpload && !credential) {
      setCredentialError("Envie o arquivo da service account.");
      return;
    }

    try {
      await upsert.mutateAsync({
        settings: { calendarId: values.calendarId, timeZone: values.timeZone, lookAheadDays: values.lookAheadDays },
        ...(credential && { credentials: credential.data }),
      });
    } catch (error) {
      const translated = translateAiIntegrationError(error);
      if (translated.field && translated.field in values) {
        form.setError(translated.field as keyof SchemaType, { message: translated.message });
      }
      setFormError({ message: translated.message, detail: translated.detail });
      return;
    }

    toast.success(`${provider.name} salvo com sucesso`);
    setStep("result");
    test.mutate();
  };

  const handleEnable = () => {
    toggle.mutate(true, {
      onSuccess: () => {
        toast.success(`${provider.name} ativado`);
        setIsOpen(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {integration ? (
          <Button variant="outline" size="sm">
            Editar
          </Button>
        ) : (
          <Button size="sm">Conectar</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{integration ? `Editar ${provider.name}` : `Conectar ${provider.name}`}</DialogTitle>
          <DialogDescription>{provider.description}</DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="grid gap-6 md:grid-cols-[1fr_340px]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid content-start gap-4" id="googleCalendarForm">
                <div className="grid gap-2">
                  <Label>Arquivo JSON da service account</Label>

                  {!showCredentialUpload && (
                    <div className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
                      <span className="flex items-center gap-2">
                        <FileCheck className="size-4 text-green-600" />
                        Credencial enviada
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsReplacingCredential(true)}>
                        Substituir arquivo
                      </Button>
                    </div>
                  )}

                  {showCredentialUpload && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={upsert.isPending}
                        >
                          {credential ? "Trocar arquivo" : "Selecionar arquivo"}
                        </Button>
                        {credential && <span className="text-muted-foreground text-sm break-all">{credential.fileName}</span>}
                        {isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsReplacingCredential(false);
                              setCredential(null);
                              setCredentialError(null);
                            }}
                          >
                            Manter credencial atual
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {credential && (
                    <div className="bg-muted rounded-md p-3 text-sm">
                      <p className="text-muted-foreground">Compartilhe a agenda com este e-mail:</p>
                      <p className="font-mono break-all">{credential.clientEmail}</p>
                    </div>
                  )}

                  {credentialError && <p className="text-destructive text-sm">{credentialError}</p>}
                </div>

                <FormField
                  control={form.control}
                  name="calendarId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID da agenda</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="abc123@group.calendar.google.com" />
                      </FormControl>
                      <FormDescription>Use o ID da agenda ou o e-mail da conta.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuso horário</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {timeZones.map((timeZone) => (
                            <option key={timeZone} value={timeZone}>
                              {timeZone}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lookAheadDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias à frente</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={1}
                          max={365}
                          step={1}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>Quantos dias à frente a IA consulta na agenda (1 a 365).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {formError && (
                  <div className="border-destructive/40 bg-destructive/10 rounded-md border p-3 text-sm">
                    <p className="text-destructive">{formError.message}</p>
                    {formError.detail && <p className="text-muted-foreground mt-1 text-xs break-all">{formError.detail}</p>}
                  </div>
                )}
              </form>
            </Form>

            <GoogleCalendarHelp />
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <p className="text-sm">Testamos a conexão com as configurações salvas.</p>
            <ConnectionTestResult status={test.status} error={test.error} clientEmail={credential?.clientEmail} />
            {test.isSuccess && integration && !integration.enabled && (
              <p className="text-muted-foreground text-sm">A integração está salva, mas desligada. Ative para a IA começar a usá-la.</p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "form" && (
            <Button type="submit" form="googleCalendarForm" disabled={upsert.isPending}>
              {upsert.isPending ? "Salvando..." : "Salvar e testar"}
            </Button>
          )}

          {step === "result" && (
            <>
              {test.isError && (
                <>
                  <Button variant="outline" onClick={() => setStep("form")}>
                    Voltar e editar
                  </Button>
                  <Button variant="outline" onClick={() => test.mutate()}>
                    Testar novamente
                  </Button>
                </>
              )}
              <Button variant={test.isSuccess && !integration?.enabled ? "outline" : "default"} onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
              {test.isSuccess && integration && !integration.enabled && (
                <Button onClick={handleEnable} disabled={toggle.isPending}>
                  Ativar integração
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
