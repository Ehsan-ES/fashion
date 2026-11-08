import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
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
  useAuthStore.setState({ user: null, status: "anonymous" });
});

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

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
});

test("shows API error message", async () => {
  requestOtp.mockRejectedValue({ response: { data: { error: { message: "شماره موبایل معتبر نیست." } } } });
  renderPage();
  fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "123" } });
  fireEvent.click(screen.getByRole("button", { name: "دریافت کد" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("شماره موبایل معتبر نیست.");
});
