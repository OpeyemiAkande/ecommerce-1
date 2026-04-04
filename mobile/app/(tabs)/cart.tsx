import SafeScreen from "@/components/SafeScreen";
import {useAddresses} from "@/hooks/useAddresses";
import useCart from "@/hooks/useCart";
import {useApi} from "@/lib/api";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import {useStripe} from "@stripe/stripe-react-native";
import {useState} from "react";
import {Address} from "@/types";
import {Ionicons} from "@expo/vector-icons";
import {Image} from "expo-image";
import OrderSummary from "@/components/OrderSummary";
import AddressSelectionModal from "@/components/AddressSelectionModal";
