import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingFeatureResources, billingResourceLabel, billingResourceUnit, billingResources } from "@/contants/billingContants";
import { billingService } from "@/services/api/billingService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addMinutes, addMonths, format, startOfMonth } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { formatCurrency } from "../ownerFormat";

const money = z.number({ error: "Informe um valor" }).min(0, "Não pode ser negativo");

// A primeira tabela pode valer desde já; as seguintes só a partir do futuro
const buildSchema = (isFirstTable: boolean) =>
  z.object({
    effectiveFrom: z
      .string()
      .min(1, "Informe a vigência")
      .refine((value) => isFirstTable || new Date(value) > new Date(), "A vigência precisa ser no futuro"),
    notes: z.string(),
    saleCommissionFixed: money,
    saleCommissionMonthlyFees: money,
    recurringCommissionPercent: money.max(100, "No máximo 100%"),
    items: z.array(
      z.object({
        resource: z.string(),
        unitCost: money,
        unitPrice: money,
        minimumQuantity: z.number({ error: "Informe o mínimo" }).int("Use um número inteiro").min(0, "Não pode ser negativo"),
      }),
    ),
    fixedCosts: z.array(z.object({ name: z.string().trim().min(1, "Informe o nome"), monthlyAmount: money })),
  });

type SchemaType = z.infer<ReturnType<typeof buildSchema>>;

const toInputDateTime = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

/** Nova versão começa como cópia da tabela mais recente, valendo a partir do próximo mês. */
const buildDefaultValues = (table: PriceTable | undefined, isEditing: boolean): SchemaType => ({
  effectiveFrom: toInputDateTime(
    isEditing && table ? new Date(table.effectiveFrom) : table ? startOfMonth(addMonths(new Date(), 1)) : addMinutes(new Date(), 1),
  ),
  notes: (isEditing && table?.notes) || "",
  saleCommissionFixed: table?.saleCommissionFixed ?? 0,
  saleCommissionMonthlyFees: table?.saleCommissionMonthlyFees ?? 0,
  recurringCommissionPercent: table?.recurringCommissionPercent ?? 0,
  items: billingResources.map((resource) => {
    const item = table?.items.find((tableItem) => tableItem.resource === resource);
    return { resource, unitCost: item?.unitCost ?? 0, unitPrice: item?.unitPrice ?? 0, minimumQuantity: item?.minimumQuantity ?? 0 };
  }),
  fixedCosts: table?.fixedCosts.map((fixedCost) => ({ ...fixedCost })) ?? [],
});

type DialogSavePriceTableProps = {
  // Tabela editada; sem ela, cria uma nova versão a partir de `baseTable`
  table?: PriceTable;
  baseTable?: PriceTable;
  trigger: ReactNode;
};

export const DialogSavePriceTable: FC<DialogSavePriceTableProps> = ({ table, baseTable, trigger }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const isEditing = !!table;
  const isFirstTable = !table && !baseTable;

  const form = useForm<SchemaType>({
    resolver: zodResolver(buildSchema(isFirstTable)),
    defaultValues: buildDefaultValues(table ?? baseTable, isEditing),
  });

  const fixedCosts = useFieldArray({ control: form.control, name: "fixedCosts" });

  const savePriceTable = useMutation({
    mutationFn: (body: SavePriceTableRequestBody) =>
      table ? billingService.updatePriceTable({ params: { priceTableId: table.id }, body }) : billingService.createPriceTable({ body }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner"] });
      toast.success(isEditing ? "Tabela alterada com sucesso" : "Tabela agendada com sucesso");
      setIsOpen(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (open) form.reset(buildDefaultValues(table ?? baseTable, isEditing));
    setIsOpen(open);
  };

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    savePriceTable.mutate({
      ...data,
      effectiveFrom: new Date(data.effectiveFrom).toISOString(),
      notes: data.notes.trim() || null,
      items: data.items.map((item) => ({ ...item, resource: item.resource as BillingResource })),
    });
  };

  const numberField = (props: { step: number; max?: number }) => ({
    type: "number" as const,
    min: 0,
    ...props,
  });

  const items = useWatch({ control: form.control, name: "items" });
  const fixedCostValues = useWatch({ control: form.control, name: "fixedCosts" });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Alterar tabela agendada" : "Nova versão da tabela de preços"}</DialogTitle>
          <DialogDescription>
            Os valores passam a valer na data de vigência. Meses anteriores continuam calculados com a tabela que estava em vigor.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6" id="form-save-price-table">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigência</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: reajuste anual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Recursos</p>
              <p className="text-muted-foreground text-sm">
                Custo e preço são mensais por unidade. O mínimo forma o pacote essencial de todo tenant.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingResources.map((resource, index) => {
                      const item = items[index];
                      const margin = item.unitPrice > 0 ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100 : null;

                      return (
                        <TableRow key={resource}>
                          <TableCell>
                            <p className="font-medium">{billingResourceLabel[resource]}</p>
                            <p className="text-muted-foreground text-xs">{billingResourceUnit[resource]}</p>
                          </TableCell>
                          {(["unitCost", "unitPrice"] as const).map((key) => (
                            <TableCell key={key} className="min-w-28">
                              <FormField
                                control={form.control}
                                name={`items.${index}.${key}`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        {...numberField({ step: key === "unitCost" ? 0.0001 : 0.01 })}
                                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="min-w-24">
                            <FormField
                              control={form.control}
                              name={`items.${index}.minimumQuantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      {...numberField({ step: 1, max: billingFeatureResources.includes(resource) ? 1 : undefined })}
                                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{margin === null ? "–" : `${margin.toFixed(0)}%`}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Comissão do representante</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    { name: "saleCommissionFixed", label: "Valor na venda (R$)", step: 0.01, description: "Pago uma vez, no mês da venda" },
                    {
                      name: "saleCommissionMonthlyFees",
                      label: "Mensalidades na venda",
                      step: 0.01,
                      description: "Ex.: 1 = uma mensalidade",
                    },
                    {
                      name: "recurringCommissionPercent",
                      label: "Recorrente (%)",
                      step: 0.01,
                      description: "Sobre a mensalidade, todo mês",
                    },
                  ] as const
                ).map((commission) => (
                  <FormField
                    key={commission.name}
                    control={form.control}
                    name={commission.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{commission.label}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            {...numberField({ step: commission.step })}
                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                          />
                        </FormControl>
                        <FormDescription>{commission.description}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Custos fixos mensais</p>
                  <p className="text-muted-foreground text-sm">
                    Servidor, banco, domínio e afins; divididos entre os tenants com plano ativo. Total:{" "}
                    {formatCurrency(fixedCostValues.reduce((total, fixedCost) => total + (fixedCost.monthlyAmount || 0), 0))}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fixedCosts.append({ name: "", monthlyAmount: 0 })}>
                  <Plus />
                  Adicionar
                </Button>
              </div>
              {fixedCosts.fields.map((fixedCost, index) => (
                <div key={fixedCost.id} className="grid grid-cols-[1fr_9rem_auto] items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`fixedCosts.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Nome" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`fixedCosts.${index}.monthlyAmount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} {...numberField({ step: 0.01 })} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remover custo" onClick={() => fixedCosts.remove(index)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form="form-save-price-table" disabled={savePriceTable.isPending}>
            {isEditing ? "Salvar" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
