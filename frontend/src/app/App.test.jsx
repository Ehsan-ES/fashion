import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders home hero with brand heading inside the layout", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: "بوتیک" })).toBeInTheDocument();
  expect(screen.getByRole("banner")).toBeInTheDocument(); // Header
  expect(screen.getByRole("contentinfo")).toBeInTheDocument(); // Footer
});
