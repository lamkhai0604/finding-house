import { BrowserRouter } from "react-router";
import { AppRoutes } from "./AppRoutes";
import { SessionProvider } from "./auth/SessionProvider";
import "./App.css";

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
