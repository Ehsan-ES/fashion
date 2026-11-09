import { act, render, renderHook, screen } from "@testing-library/react";
import { navigate } from "vike/client/router";
import { beforeEach, expect, test } from "vitest";
import { setTestUrl } from "../../test/router";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from ".";

beforeEach(() => {
  setTestUrl("/shop?gender=women&size=M");
  navigate.mockClear();
});

test("useLocation and useSearchParams read the Vike page context", () => {
  const loc = renderHook(() => useLocation()).result.current;
  expect(loc).toEqual({ pathname: "/shop", search: "?gender=women&size=M" });
  const params = renderHook(() => useSearchParams()).result.current;
  expect(params.get("gender")).toBe("women");
  expect(params.get("missing")).toBeNull();
});

test("useLocation has an empty search when there is no query", () => {
  setTestUrl("/about");
  expect(renderHook(() => useLocation()).result.current.search).toBe("");
});

test("useNavigate maps replace to overwriteLastHistoryEntry", () => {
  const nav = renderHook(() => useNavigate()).result.current;
  act(() => { nav("/cart"); nav("/login", { replace: true }); });
  expect(navigate).toHaveBeenNthCalledWith(1, "/cart", { overwriteLastHistoryEntry: false });
  expect(navigate).toHaveBeenNthCalledWith(2, "/login", { overwriteLastHistoryEntry: true });
});

test("Navigate redirects on mount", () => {
  render(<Navigate to="/login" replace />);
  expect(navigate).toHaveBeenCalledWith("/login", { overwriteLastHistoryEntry: true });
});

test("Link renders a plain anchor so Vike can intercept it", () => {
  render(<Link to="/shop?gender=men" className="x">فروشگاه</Link>);
  const a = screen.getByRole("link", { name: "فروشگاه" });
  expect(a).toHaveAttribute("href", "/shop?gender=men");
  expect(a).toHaveClass("x");
});
