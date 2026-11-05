import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "../AppRoutes";
import { SessionProvider } from "../auth/SessionProvider";

/** Renders the whole app at a given URL, as a user would see it. */
export function renderApp(path: string) {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </SessionProvider>,
  );
}
