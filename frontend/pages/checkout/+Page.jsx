import RequireAuth from "../../src/features/auth/RequireAuth";
import CheckoutPage from "../../src/features/cart/CheckoutPage";

export default function Page() {
  return <RequireAuth><CheckoutPage /></RequireAuth>;
}
