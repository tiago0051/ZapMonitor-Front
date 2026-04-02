import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Input } from "@/components/ui/input.tsx";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService.ts";
import { requestErrorHandling } from "@/utils/request.tsx";
import { toast } from "sonner";
import { useClientContext } from "@/context/ClientContext/clientContext.ts";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Pencil, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";

type WhatsappChatMessageHeaderProps = {
  contactMessage: WhatsappContactMessage;
  className?: string;
};

export const WhatsappChatMessageHeader = ({ contactMessage, className }: WhatsappChatMessageHeaderProps) => {
  const { client } = useClientContext();
  const { setContactSelected } = useWhatsappContext();

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editedName, setEditedName] = useState<string>(contactMessage.surname || contactMessage.name);
  const [editedCategories, setEditedCategories] = useState<WhatsappMessageCategory[]>(contactMessage.categories || []);
  const [newCategoryId, setNewCategoryId] = useState<string>("");

  const findAllWhatsappCategoriesQuery = useQuery({
    queryKey: ["whatsappCategories", client.id],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({
        queries: { page: 1, take: 100, text: "" },
        params: { clientId: client.id },
      }),
  });

  const availableCategories = findAllWhatsappCategoriesQuery.data?.items || [];

  const updateWhatsappContactMutation = useMutation({
    mutationFn: whatsappService.updateContact,
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("Nome salvo com sucesso");
    },
  });

  const updateWhatsappContactCategoriesMutation = useMutation({
    mutationFn: whatsappService.updateLinkCategoryToContact,
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("Categorias salvas com sucesso");
      setIsEditingContact(false);
      setContactSelected({
        ...contactMessage,
        surname: editedName,
        categories: editedCategories,
      });
    },
  });

  const handleSaveEdit = () => {
    updateWhatsappContactMutation.mutate({
      params: { contactId: contactMessage.id, clientId: client.id },
      body: { surname: editedName },
    });

    updateWhatsappContactCategoriesMutation.mutate({
      params: { contactId: contactMessage.id, clientId: client.id },
      body: editedCategories.map((c: WhatsappMessageCategory) => c.id),
    });
  };

  const handleCancelEdit = () => {
    setIsEditingContact(false);
    setEditedName(contactMessage.surname || contactMessage.name);
    setEditedCategories(contactMessage.categories || []);
    setNewCategoryId("");
  };

  const handleStartEdit = () => {
    setIsEditingContact(true);
  };

  const handleAddCategory = () => {
    if (!newCategoryId) return;
    const categoryToAdd = availableCategories.find((c: WhatsappMessageCategory) => c.id === newCategoryId);
    if (!categoryToAdd || editedCategories.some((c: WhatsappMessageCategory) => c.id === categoryToAdd.id)) return;
    setEditedCategories([...editedCategories, categoryToAdd]);
    setNewCategoryId("");
  };

  const handleRemoveCategory = (categoryToRemove: WhatsappMessageCategory) => {
    setEditedCategories(editedCategories.filter((c: WhatsappMessageCategory) => c.id !== categoryToRemove.id));
  };

  const phoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);
  const formattedPhoneNumber = phoneNumber?.format("INTERNATIONAL");

  return (
    <DialogHeader className={cn("border-b px-6 py-4", className)}>
      <div className="flex items-start justify-between">
        <div className="mr-4 flex-1">
          {isEditingContact ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Nome do contato"
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {editedCategories.map((category) => (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className="hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                      onClick={() => handleRemoveCategory(category)}
                    >
                      {category.name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <option value="" disabled>
                      Selecione uma categoria...
                    </option>
                    {availableCategories.map((cat: WhatsappMessageCategory) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <Button size="icon" variant="outline" onClick={handleAddCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogDescription className="text-sm">{formattedPhoneNumber}</DialogDescription>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{contactMessage.surname || contactMessage.name}</DialogTitle>
                <Button size="icon" variant="ghost" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription className="mt-1 text-sm">{formattedPhoneNumber}</DialogDescription>
            </>
          )}
        </div>
        {!isEditingContact && (
          <div className="flex gap-2">
            {contactMessage.categories?.map((category, index) => (
              <Badge key={index} variant="outline">
                {category.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </DialogHeader>
  );
};
