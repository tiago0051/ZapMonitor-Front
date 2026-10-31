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
    },
    disabled: createAiConfig.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    createAiConfig.mutate({
      body: { apiKey: data.apiKey },
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
          <DialogDescription>Informe a chave de API usada pelos agentes de IA, transcrições e resumos deste cliente.</DialogDescription>
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
