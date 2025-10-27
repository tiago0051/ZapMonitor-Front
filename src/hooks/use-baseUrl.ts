import { useParams } from "react-router";

export const useBaseUrl = () => {
  const { clientId } = useParams<{ clientId: string }>();
  return `/dashboard/client/${clientId}`;
};
