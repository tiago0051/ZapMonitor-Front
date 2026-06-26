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

type DialogCreateAiConfigProps = {
  className?: string;
  clientId: string;
};

const schema = z.object({
  apiKey: z.string().min(1, "A chave de API é obrigatória"),
  systemPrompt: z.string().min(1, "O prompt do sistema é obrigatório"),
  model: z.string().min(1, "O modelo é obrigatório"),
  temperature: z.number().min(0).max(1, "A temperatura deve estar entre 0 e 1"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogCreateAiConfig: FC<DialogCreateAiConfigProps> = ({ clientId, className }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const createAiConfig = useMutation({
    mutationFn: aiService.createClientAiConfig,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["aiConfig", clientId],
      });
      toast.success("Configuração de IA criada com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      apiKey: "",
      systemPrompt: "",
      model: "gemini-3.1-flash-lite",
      temperature: 0.7,
    },
    disabled: createAiConfig.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    const { apiKey, systemPrompt } = data;

    createAiConfig.mutate({
      body: {
        apiKey,
        systemPrompt,
        model: "gemini-3.1-flash-lite",
        temperature: 0.7,
      },
      params: { clientId },
    });
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={className}>Criar Configuração de IA</Button>
      </DialogTrigger>

      <DialogContent className="max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Configuração de IA</DialogTitle>
          <DialogDescription>Configure os parâmetros de inteligência artificial para este cliente.</DialogDescription>
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
              name="model"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="gpt-4o-mini" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temperature"
              disabled
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperatura (0-1)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="0.7" type="number" min="0" max="1" step="0.1" />
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
          <Button type="submit" form="form" disabled={createAiConfig.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
