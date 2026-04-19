import {useEffect, useRef} from "react";
import * as Linking from "expo-linking";
import {useApi} from "./api";
import {Alert} from "react-native";
import {usePayment} from "@/context/PaymentContext";

export const usePaystackDeepLink = () => {
  const api = useApi();
  const {setPayment} = usePayment();

  // ✅ Keep a ref so the effect always sees the latest data without re-subscribing
  // const dataRef = useRef(data);
  // useEffect(() => {
  //   dataRef.current = data;
  // }, [data]);

  useEffect(() => {
    const handleDeepLink = (event: any) => {
      console.log("Deep link received:", event.url);
      const parsed = Linking.parse(event.url);
      console.log("Parsed:", parsed);

      const reference = parsed.queryParams?.reference;
      if (reference) {
        verifyPayment(reference);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({url});
    });

    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => subscription.remove();
  }, []); // ✅ Safe to keep [] because we use a ref

  const verifyPayment = async (reference: string | string[]) => {
    try {
      const ref = (reference as string).split(",")[0];

      setPayment({status: "verifying", reference: ref});

      const response = await api.get(`/payments/verify-payment/${ref}`); // ✅ Renamed from `data`

      setPayment({status: "success", reference: ref});
    } catch (error: any) {
      Alert.alert("Error", error.response.data.error);
      console.log(error);
    }
  };

  return null;
};
