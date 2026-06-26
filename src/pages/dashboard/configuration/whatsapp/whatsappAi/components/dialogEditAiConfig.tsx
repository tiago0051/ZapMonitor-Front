import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { aiService } from "@/services/api/aiService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

type DialogEditAiConfigProps = {
  className?: string;
  clientId: string;
  aiConfig: AiConfig;
};

const schema = z.object({
  apiKey: z.string(),
  systemPrompt: z.string().min(1, "O prompt do sistema é obrigatório"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogEditAiConfig: FC<DialogEditAiConfigProps> = ({ clientId, className, aiConfig }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const updateAiConfig = useMutation({
    mutationFn: aiService.updateClientAiConfig,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["aiConfig", clientId],
      });
      toast.success("Configuração de IA atualizada com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      apiKey: "",
      systemPrompt: aiConfig.systemPrompt,
    },
    disabled: updateAiConfig.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    const { apiKey, systemPrompt } = data;
    updateAiConfig.mutate({
      body: { apiKey: apiKey || undefined, systemPrompt },
      params: { clientId },
    });
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        apiKey: "",
        systemPrompt: aiConfig.systemPrompt,
      });
    }
  }, [isOpen, form, aiConfig]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Configuração de IA</DialogTitle>
          <DialogDescription>Atualize os parâmetros de inteligência artificial para este cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave de API</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Sua chave de API" type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt do Sistema</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="Digite o prompt do sistema"
                      className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form" disabled={updateAiConfig.isPending}>
            Atualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
