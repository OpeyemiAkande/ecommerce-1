import {View, Text} from "react-native";

interface OrderSummaryProps {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export default function OrderSummary({
  subtotal,
  shipping,
  tax,
  total
}: OrderSummaryProps) {
  return (
    <View className="px-6 mt-6">
      <View className="bg-surface rounded-3xl p-5">
        <Text className="text-text-primary text-xl font-bold mb-4">
          Summary
        </Text>

        <View
      </View>
    </View>
  );
}
