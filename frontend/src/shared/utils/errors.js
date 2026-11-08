/** پیام خطای قابل‌نمایش از پاسخ استاندارد API: {"error": {"message", "code", "retry_after"}} */
export function getErrorMessage(err, fallback = "خطایی رخ داد. دوباره تلاش کنید.") {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.response?.data?.detail) return err.response.data.detail;
  if (err?.code === "ERR_NETWORK") return "ارتباط با سرور برقرار نشد.";
  return fallback;
}

export const getRetryAfter = (err) => err?.response?.data?.error?.retry_after ?? null;
