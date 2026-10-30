import {useQuery, useQueryClient, useMutation} from "@tanstack/react-query";
import {useApi} from "@/lib/api";

const useVerify = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const verifyPayment = async (reference: string | string[]) => {
    const data = await api.get(
      `/payments/verify-payment?reference=${reference}`
    );

    console.log(data);
  };

  return useQuery({
    queryKey: [""],
    queryFn: async () => {}
  });
};
