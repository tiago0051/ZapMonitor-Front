import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { clientService } from "@/services/api/clientService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";

const formSchema = z.object({
  name: z.string().min(3).max(100),
});

type FormSchemaType = z.infer<typeof formSchema>;

type DialogCreateClientProps = {
  onCreate: (secret: string) => void;
};

export const DialogCreateClient = ({ onCreate }: DialogCreateClientProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const createClientMutation = useMutation({
    mutationFn: clientService.create,
    onSuccess: (data) => {
      onCreate(data.secret);
    },
    onError: requestErrorHandling,
    onSettled: () => {
      form.reset();

      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
    disabled: createClientMutation.isPending,
  });

  const onSubmit = form.handleSubmit((data) => {
    createClientMutation.mutate({ body: data });
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Adicionar cliente</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar cliente</DialogTitle>
          <DialogDescription>
            Preencha as informações do cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="create-client-form" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="submit"
            form="create-client-form"
            disabled={createClientMutation.isPending}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
