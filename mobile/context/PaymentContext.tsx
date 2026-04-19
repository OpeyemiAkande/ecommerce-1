import React, {createContext, useContext, useState} from "react";

interface PaymentState {
  status: "idle" | "pending" | "verifying" | "success" | "failed";
  reference: string | null;
}

interface PaymentContextType {
  payment: PaymentState;
  setPayment: (state: Partial<PaymentState>) => void;
  reset: () => void;
}

const initialState: PaymentState = {
  status: "idle",
  reference: null
};

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({children}: {children: React.ReactNode}) => {
  const [payment, setPaymentState] = useState<PaymentState>(initialState);

  const setPayment = (newState: Partial<PaymentState>) => {
    setPaymentState((prev) => ({...prev, ...newState}));
  };

  const reset = () => setPaymentState(initialState);

  return (
    <PaymentContext.Provider value={{payment, setPayment, reset}}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context)
    throw new Error("usePayment must be used within a PaymentProvider");
  return context;
};
