import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api, getSession, setCsrfToken } from "@/lib/api";

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({ queryKey: ["session"], queryFn: getSession, staleTime: 60_000, retry: false });

  const logoutMutation = useMutation({
    mutationFn: () => api<{ ok: boolean }>("/logout", {}),
    onSuccess: async () => {
      setCsrfToken("");
      queryClient.setQueryData(["session"], { user: null, csrfToken: "" });
      await queryClient.invalidateQueries();
      navigate("/");
    },
    onError: (error) => {
      setCsrfToken("");
      toast.error(error.message);
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);
  return {
    user: sessionQuery.data?.user ?? null,
    isAuthenticated: Boolean(sessionQuery.data?.user),
    isLoading: sessionQuery.isLoading || logoutMutation.isPending,
    error: sessionQuery.error,
    logout,
    refresh: sessionQuery.refetch,
  };
}
