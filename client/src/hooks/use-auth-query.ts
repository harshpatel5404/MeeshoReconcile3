import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

export function useAuthQuery<T>(options: UseQueryOptions<T> & { queryKey: readonly string[] }) {
  const { token } = useAuth();
  
  return useQuery({
    ...options,
    queryFn: getQueryFn({ on401: "throw", token }),
  });
}

export function useAuthMutation<TData = unknown, TError = unknown, TVariables = void>(
  mutationFn: (variables: TVariables, token: string | null) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const { token } = useAuth();
  
  const authenticatedMutationFn = async (variables: TVariables): Promise<TData> => {
    return mutationFn(variables, token);
  };

  return useMutation({
    mutationFn: authenticatedMutationFn,
    ...options,
  });
}

export function useAuthApiRequest() {
  const { token } = useAuth();
  
  return (method: string, url: string, data?: unknown) => {
    return apiRequest(method, url, data, token);
  };
}