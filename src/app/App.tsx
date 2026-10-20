import { lazy, Suspense } from "react";
import {
  BarChart3,
  BrainCircuit,
  LayoutDashboard,
  Lightbulb,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";





const DashboardPage = lazy(
  () => import("../modules/dashboard/DashboardPage")
);

const CustomersPage = lazy(
  () => import("../modules/customers/CustomersPage")
);

const SegmentationPage = lazy(
  () => import("../modules/segmentation/SegmentationPage")
);


const RecommendationsPage = lazy(
  () => import("../modules/recommendations/RecommendationsPage")
);

const navigation = [
  {
    path: "/",
    name: "Panel principal",
    icon: LayoutDashboard,
  },
  {
    path: "/clientes",
    name: "Clientes",
    icon: UsersRound,
  },
  {
    path: "/segmentacion",
    name: "Segmentación",
    icon: BrainCircuit,
  },
  {
    path: "/recomendaciones",
    name: "Recomendaciones",
    icon: Lightbulb,
  },
];

function AppLayout() {
  const location = useLocation();

  const active = navigation.find(
    (item) => item.path === location.pathname,
  );

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <BarChart3 size={25} />
          </div>

          <div>
            <strong>Comercial Nova</strong>
            <span>Customer Intelligence</span>
          </div>
        </div>

        <div className="sidebar-caption">
          PLATAFORMA
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Navegación principal"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                "navigation-link" +
                (isActive ? " active" : "")
              }
            >
              <item.icon size={19} />

              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-ml-card">
            <BrainCircuit size={25} />

            <div>
              <strong>Machine Learning</strong>
              <span>
                K-Means · Semana 10
              </span>
            </div>
          </div>

          <div className="sidebar-footer">
            <ShieldCheck size={14} />
            Práctica académica
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-heading">
            <span>
              Sistema de segmentación de clientes
            </span>

            <h1>
              {active?.name ?? "Comercial Nova"}
            </h1>
          </div>

          <div className="topbar-actions">
            <span className="environment-badge">
              <span className="status-dot" />
              Entorno de práctica
            </span>

            <div
              className="brand-avatar"
              title="Comercial Nova"
            >
              CN
            </div>
          </div>
        </header>

        <main className="page-container">
          <Suspense fallback={<div className="centered-state">Cargando módulo...</div>}>
          <Routes>
            <Route
              path="/"
              element={<DashboardPage />}
            />

            <Route
              path="/clientes"
              element={<CustomersPage />}
            />

            <Route
              path="/segmentacion"
              element={<SegmentationPage />}
            />

            <Route path="/analisis" element={<Navigate to="/segmentacion" replace />} />
            <Route
              path="/recomendaciones"
              element={<RecommendationsPage />}
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
