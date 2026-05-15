import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import Contacts from "./pages/Contacts";
import Segments from "./pages/Segments";
import SegmentDetail from "./pages/SegmentDetail";
import Agents from "./pages/Agents";
import Sources from "./pages/Sources";
import TemplateManager from "./pages/TemplateManager";
import ImageResizerPage from "./pages/ImageResizerPage";
import NotFound from "./pages/NotFound";

import { AuthProvider } from "./lib/AuthContext";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Layout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />

              <Route
                path="/conversations"
                element={<Conversations />}
              />

              <Route
                path="/contacts"
                element={<Contacts />}
              />

              <Route
                path="/segments"
                element={<Segments />}
              />

              <Route
                path="/segments/:id"
                element={<SegmentDetail />}
              />

              <Route
                path="/agents"
                element={<Agents />}
              />

              <Route
                path="/sources"
                element={<Sources />}
              />

              <Route
                path="/templates"
                element={<TemplateManager />}
              />

              {/* IMAGE RESIZER */}
              <Route
                path="/image-resizer"
                element={<ImageResizerPage />}
              />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
