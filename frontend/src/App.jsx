import { ThemeProvider } from "./context/ThemeContext";
import AppRoutes from "./routes/Approutes";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  return (
    <ThemeProvider>
      <ThemeToggle />
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;