import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "./app/ThemeContext";

export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(<ThemeProvider>{ui}</ThemeProvider>, options);
}
