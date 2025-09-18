type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  canNextPage: boolean;
  canPreviousPage: boolean;
};
