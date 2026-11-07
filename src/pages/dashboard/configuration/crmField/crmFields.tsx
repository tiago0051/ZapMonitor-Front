import { EmptyState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crmFieldTypeLabel, crmSelectClassName, crmTextareaClassName } from "@/pages/dashboard/crm/crmUtils";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState, type FC } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

const DialogSaveCrmField: FC<{ clientId: string; field?: CrmField }> = ({ clientId, field }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CrmFieldType>("TEXT");
  const [scope, setScope] = useState<CrmFieldScope>("DEAL");
  const [aiFillable, setAiFillable] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  // Uma opção por linha
  const [optionsText, setOptionsText] = useState("");
  const queryClient = useQueryClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "fields", clientId] });
    queryClient.invalidateQueries({ queryKey: ["contacts", "fields", clientId] });
    toast.success(field ? "Campo atualizado" : "Campo criado");
    setIsOpen(false);
  };

  const createField = useMutation({ mutationFn: crmService.createCrmField, onError: requestErrorHandling, onSuccess });
  const updateField = useMutation({ mutationFn: crmService.updateCrmField, onError: requestErrorHandling, onSuccess });
  const isPending = createField.isPending || updateField.isPending;

  const options = optionsText
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
  const isValid = name.trim() !== "" && (type !== "SELECT" || options.length > 0);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(field?.name ?? "");
      setType(field?.type ?? "TEXT");
      setScope(field?.scope ?? "DEAL");
      setAiFillable(field?.aiFillable ?? false);
      setAiInstruction(field?.aiInstruction ?? "");
      setOptionsText(field?.options.join("\n") ?? "");
    }

    setIsOpen(open);
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const body: SaveCrmFieldRequestBody = {
      name: name.trim(),
      type,
      ...(!field && { scope }),
      aiFillable,
      aiInstruction: aiFillable ? aiInstruction.trim() || null : null,
      ...(type === "SELECT" && { options }),
    };
    if (field) updateField.mutate({ params: { clientId, fieldId: field.id }, body });
    else createField.mutate({ params: { clientId }, body });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {field ? (
          <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8" aria-label={`Editar ${field.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Novo campo</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? "Editar campo" : "Novo campo"}</DialogTitle>
          <DialogDescription>
            Campo do negócio muda a cada oportunidade (ex.: produto); campo do contato vale para a pessoa e aparece na ficha (ex.: CPF). O
            tipo e o lugar não mudam depois de criado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="crm-field-name">Nome</Label>
            <Input
              id="crm-field-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: CPF"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crm-field-scope">Onde aparece</Label>
            <select
              id="crm-field-scope"
              value={scope}
              disabled={!!field}
              onChange={(event) => setScope(event.target.value as CrmFieldScope)}
              className={crmSelectClassName}
            >
              <option value="DEAL">No negócio</option>
              <option value="CONTACT">Na ficha do contato</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crm-field-type">Tipo</Label>
            <select
              id="crm-field-type"
              value={type}
              disabled={!!field}
              onChange={(event) => setType(event.target.value as CrmFieldType)}
              className={crmSelectClassName}
            >
              {(Object.keys(crmFieldTypeLabel) as CrmFieldType[]).map((fieldType) => (
                <option key={fieldType} value={fieldType}>
                  {crmFieldTypeLabel[fieldType]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={aiFillable} onChange={(event) => setAiFillable(event.target.checked)} />A IA pode preencher
            </label>
            <p className="text-muted-foreground text-xs">
              A IA lê as conversas e preenche o campo quando a pessoa informar o valor. Campo vazio é preenchido na hora; valor diferente do
              atual vira sugestão para alguém aprovar.
            </p>
            {aiFillable && (
              <Input
                aria-label="Instrução para a IA"
                value={aiInstruction}
                maxLength={300}
                onChange={(event) => setAiInstruction(event.target.value)}
                placeholder="Instrução opcional, ex.: só os números do CPF"
              />
            )}
          </div>
          {type === "SELECT" && (
            <div className="grid gap-2">
              <Label htmlFor="crm-field-options">Opções (uma por linha)</Label>
              <textarea
                id="crm-field-options"
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                placeholder={"Consignado\nCartão benefício\nPortabilidade"}
                className={crmTextareaClassName}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CrmFields = () => {
  const { clientId } = useParams();
  const queryClient = useQueryClient();

  const findAllFieldsQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["crm", "fields", clientId, "all"],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: clientId! }, includeContactFields: true }),
  });

  const setFieldActive = useMutation({
    mutationFn: crmService.setCrmFieldActive,
    onError: requestErrorHandling,
    onSuccess: (field) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "fields", clientId] });
      queryClient.invalidateQueries({ queryKey: ["contacts", "fields", clientId] });
      toast.success(field.active ? "Campo reativado" : "Campo desativado");
    },
  });

  const fields = findAllFieldsQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Campos personalizados</CardTitle>
          <CardDescription>
            Informações extras do negócio (como produto) ou da ficha do contato (como CPF). Cada etapa do funil pode exigir campos do
            negócio preenchidos antes de receber um negócio. Desativar um campo tira ele dos formulários e das exigências, sem apagar os
            valores.
          </CardDescription>
        </div>
        <DialogSaveCrmField clientId={clientId!} />
      </CardHeader>
      <CardContent>
        {fields.length === 0 && (
          <EmptyState title="Nenhum campo cadastrado" description="Os negócios têm só título, valor, responsável e notas." />
        )}

        {fields.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {fields.map((field) => (
              <li key={field.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className={field.active ? "text-sm font-medium" : "text-muted-foreground text-sm line-through"}>{field.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {field.scope === "CONTACT" ? "Ficha do contato" : "Negócio"} · {crmFieldTypeLabel[field.type]}
                    {field.aiFillable && " · IA preenche"}
                    {field.type === "SELECT" && `: ${field.options.join(", ")}`}
                  </p>
                </div>
                {!field.active && <Badge variant="secondary">Inativo</Badge>}
                <DialogSaveCrmField clientId={clientId!} field={field} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setFieldActive.isPending}
                  onClick={() =>
                    setFieldActive.mutate({ params: { clientId: clientId!, fieldId: field.id }, body: { active: !field.active } })
                  }
                >
                  {field.active ? "Desativar" : "Reativar"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
