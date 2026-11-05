import { HealthStatus } from "./components/HealthStatus";
import "./App.css";

export default function App() {
  return (
    <main className="app">
      <h1>Finding House</h1>
      <p>Find a room in Seattle by just describing it.</p>
      <HealthStatus />
    </main>
  );
}
