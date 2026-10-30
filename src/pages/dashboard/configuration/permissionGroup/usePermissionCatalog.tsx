import { permissionGroupService } from "@/services/api/permissionGroupService";
import { useQuery } from "@tanstack/react-query";

/** Permissões que podem entrar em um grupo personalizado, agrupadas por módulo. */
export const usePermissionCatalog = (clientId: string) => {
  const findCatalogQuery = useQuery({
    queryKey: ["permissionCatalog", clientId],
    queryFn: () => permissionGroupService.findCatalog({ params: { clientId } }),
    staleTime: Infinity,
  });

  const catalog = findCatalogQuery.data ?? [];
  const assignable = catalog.filter((definition) => !definition.implanterOnly);

  const modules = assignable.reduce<{ name: string; permissions: PermissionDefinition[] }[]>((result, definition) => {
    const module = result.find((item) => item.name === definition.module);
    if (module) module.permissions.push(definition);
    else result.push({ name: definition.module, permissions: [definition] });
    return result;
  }, []);

  const getLabel = (permission: Permission) => catalog.find((definition) => definition.key === permission)?.label ?? permission;

  return { modules, getLabel, isLoading: findCatalogQuery.isLoading };
};
