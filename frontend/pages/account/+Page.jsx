import AccountPage from "../../src/features/account/AccountPage";
import RequireAuth from "../../src/features/auth/RequireAuth";

export default function Page() {
  return (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  );
}
