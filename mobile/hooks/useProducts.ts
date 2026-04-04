import {useApi} from "@/lib/api";
import {Product} from "@/types";
import {useQuery} from "@tanstack/react-query";

const useProducts = () => {
  const api = useApi();

  const result = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const {data} = await api.get<Product[]>("/products");
      return data;
    }
  });

  // console.log(result);

  return result;
};

export default useProducts;
