import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { tenantRoleDescription, tenantRoleLabel } from "@/contants/permissionContants";
import { useFormContext } from "react-hook-form";
import { useMemberRoleOptions } from "../useMemberRoleOptions";

type MemberRoleFormValues = { role: TenantRole; permissionGroupId: string };

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm";

/** Campos de papel e grupo de permissão; precisa estar dentro de um <Form>. */
export const MemberRoleFields = ({ clientId }: { clientId: string }) => {
  const { control, watch } = useFormContext<MemberRoleFormValues>();
  const { roleOptions, permissionGroupOptions } = useMemberRoleOptions(clientId);

  const role = watch("role");

  return (
    <>
      <FormField
        control={control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Papel</FormLabel>
            <FormControl>
              <select {...field} className={selectClassName}>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {tenantRoleLabel[option]}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormDescription>{tenantRoleDescription[role]}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {role === "CUSTOM" && (
        <FormField
          control={control}
          name="permissionGroupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo de permissão</FormLabel>
              <FormControl>
                <select {...field} className={selectClassName}>
                  <option value="">Selecione</option>
                  {permissionGroupOptions.map((permissionGroup) => (
                    <option key={permissionGroup.id} value={permissionGroup.id}>
                      {permissionGroup.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              {permissionGroupOptions.length === 0 && (
                <FormDescription>Nenhum grupo disponível. Crie um em Configurações › Grupos de permissão.</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
};
