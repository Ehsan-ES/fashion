import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { navigate } from "vike/client/router";
import { beforeEach, expect, test, vi } from "vitest";
import { setTestUrl } from "../../test/router";
import LoginPage from "./LoginPage";
import { useAuthStore } from "./useAuthStore";

vi.mock("./authService", () => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
  fetchMe: vi.fn(),
  logoutRequest: vi.fn(),
  updateMe: vi.fn(),
}));
import { requestOtp, verifyOtp } from "./authService";

beforeEach(() => {
  vi.clearAllMocks();
  setTestUrl("/login");
  useAuthStore.setState({ user: null, status: "anonymous" });
});

const renderPage = () => render(<LoginPage />);

test("sends phone, shows code step, then logs in", async () => {
  requestOtp.mockResolvedValue({ expires_in: 120, resend_after: 60 });
  verifyOtp.mockResolvedValue({ access: "tok", user: { phone: "09123456789" }, is_new: true });
  renderPage();

  fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "09123456789" } });
  fireEvent.click(screen.getByRole("button", { name: "دریافت کد" }));
  await screen.findByLabelText("کد تأیید");
  expect(requestOtp).toHaveBeenCalledWith("09123456789");

  fireEvent.change(screen.getByLabelText("کد تأیید"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "ورود" }));
  await waitFor(() => expect(useAuthStore.getState().status).toBe("authenticated"));
  expect(verifyOtp).toHaveBeenCalledWith("09123456789", "123456");
  expect(navigate).toHaveBeenCalledWith("/account", { overwriteLastHistoryEntry: true });
});

test("redirects to the internal ?next= path after login", async () => {
  setTestUrl("/login?next=%2Fcart");
  requestOtp.mockResolvedValue({ expires_in: 120, resend_after: 60 });
  verifyOtp.mockResolvedValue({ access: "tok", user: { phone: "09123456789" }, is_new: false });
  renderPage();
  fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "09123456789" } });
  fireEvent.click(screen.getByRole("button", { name: "دریافت کد" }));
  fireEvent.change(await screen.findByLabelText("کد تأیید"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "ورود" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/cart", { overwriteLastHistoryEntry: true }));
});

test("ignores external ?next= URLs", async () => {
  setTestUrl("/login?next=%2F%2Fevil.com");
  requestOtp.mockResolvedValue({ expires_in: 120, resend_after: 60 });
  verifyOtp.mockResolvedValue({ access: "tok", user: { phone: "09123456789" }, is_new: false });
  renderPage();
  fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "09123456789" } });
  fireEvent.click(screen.getByRole("button", { name: "دریافت کد" }));
  fireEvent.change(await screen.findByLabelText("کد تأیید"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "ورود" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/account", { overwriteLastHistoryEntry: true }));
});

test("shows API error message", async () => {
  requestOtp.mockRejectedValue({ response: { data: { error: { message: "شماره موبایل معتبر نیست." } } } });
  renderPage();
  fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "123" } });
  fireEvent.click(screen.getByRole("button", { name: "دریافت کد" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("شماره موبایل معتبر نیست.");
});
