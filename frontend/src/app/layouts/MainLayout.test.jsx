import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { setTestUrl } from "../../test/router";
import MainLayout from "./MainLayout";

const renderLayout = (url) => {
  setTestUrl(url);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MainLayout><h1>محتوا</h1></MainLayout>
    </QueryClientProvider>
  );
};

beforeEach(() => setTestUrl("/"));

test("wraps the page with header, main and footer", () => {
  renderLayout("/");
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "محتوا" }));
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "پرش به محتوا" })).toHaveAttribute("href", "#main");
});

test("header is transparent only on the home page", () => {
  const home = renderLayout("/");
  expect(home.container.querySelector("header")).toHaveAttribute("data-tone", "light");
  home.unmount();
  const other = renderLayout("/about");
  expect(other.container.querySelector("header")).toHaveAttribute("data-tone", "dark");
});
