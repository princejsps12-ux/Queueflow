import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { QueuesPage } from "./pages/QueuesPage";
import { QueueDetailPage } from "./pages/QueueDetailPage";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/queues/:id" element={<QueueDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/queues" replace />} />
      <Route path="*" element={<Navigate to="/queues" replace />} />
    </Routes>
  );
}

export default App;
