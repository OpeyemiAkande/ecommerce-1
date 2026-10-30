import {Navigate, Route, Routes} from "react-router";
import LoginPage from "./pages/LoginPage";
import PageLoader from "./components/PageLoader";
import {useAuth} from "@clerk/clerk-react";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import CustomersPage from "./pages/CustomersPage";
import {setAuthTokenGetter} from "./lib/axios";

function App() {
  const {isSignedIn, isLoaded, getToken} = useAuth();

  // Set during render (not in an effect) so child queries see it on first fetch
  setAuthTokenGetter(getToken);

  if (!isLoaded) return <PageLoader />;

  return (
    <Routes>
      <Route
        path="/login"
        element={isSignedIn ? <Navigate to={"/dashboard"} /> : <LoginPage />}
      />

      <Route
        path="/"
        element={isSignedIn ? <DashboardLayout /> : <Navigate to={"/login"} />}
      >
        <Route index element={<Navigate to={"dashboard"} />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="customers" element={<CustomersPage />} />
      </Route>
    </Routes>
  );
}

export default App;
