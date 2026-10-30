type FindAllPermissionGroupsRequestData = {
  params: FindAllPermissionGroupsRequestParams;
};

type FindAllPermissionGroupsRequestParams = {
  clientId: string;
};

type SavePermissionGroupRequestBody = {
  name: string;
  description: string | null;
  permissions: Permission[];
};

type CreatePermissionGroupRequestData = {
  params: CreatePermissionGroupRequestParams;
  body: SavePermissionGroupRequestBody;
};

type CreatePermissionGroupRequestParams = {
  clientId: string;
};

type UpdatePermissionGroupRequestData = {
  params: UpdatePermissionGroupRequestParams;
  body: SavePermissionGroupRequestBody;
};

type UpdatePermissionGroupRequestParams = {
  clientId: string;
  permissionGroupId: string;
};

type DeletePermissionGroupRequestData = {
  params: DeletePermissionGroupRequestParams;
};

type DeletePermissionGroupRequestParams = {
  clientId: string;
  permissionGroupId: string;
};
