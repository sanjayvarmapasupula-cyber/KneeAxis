import { Route, Switch, Redirect } from 'wouter';
import { useAuthStore } from '@/store/useAppStore';

// Public pages
import Home from '@/pages/Home';
import Features from '@/pages/public/Features';
import Workflow from '@/pages/public/Workflow';
import About from '@/pages/public/About';
import Contact from '@/pages/public/Contact';

// Legal pages
import PrivacyPolicy from '@/pages/legal/PrivacyPolicy';
import TermsOfUse from '@/pages/legal/TermsOfUse';
import MedicalDisclaimer from '@/pages/legal/MedicalDisclaimer';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';

// Authenticated workspace pages
import Dashboard from '@/pages/Dashboard';
import PatientRegistry from '@/pages/PatientRegistry';
import PatientDetails from '@/pages/PatientDetails';
import ImagingViewer from '@/pages/ImagingViewer';
import AIModels from '@/pages/AIModels';
import Segmentation from '@/pages/Segmentation';
import LivePipeline from '@/pages/LivePipeline';
import Reconstruction from '@/pages/Reconstruction';
import SurgicalPlanning from '@/pages/SurgicalPlanning';
import Reports from '@/pages/Reports';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

function Protected({ component: Component }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Login />;
  }
  return <Component />;
}

export default function AppRoutes() {
  return (
    <Switch>
      {/* Public Pages */}
      <Route path="/" component={Home} />
      <Route path="/features" component={Features} />
      <Route path="/workflow" component={Workflow} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />

      {/* Legal Pages */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfUse} />
      <Route path="/medical-disclaimer" component={MedicalDisclaimer} />

      {/* Auth Pages */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Workspace Pages (with canonical /app/* and short /* aliases) */}
      <Route path="/dashboard">{() => <Protected component={Dashboard} />}</Route>
      <Route path="/app/dashboard">{() => <Protected component={Dashboard} />}</Route>

      <Route path="/patients">{() => <Protected component={PatientRegistry} />}</Route>
      <Route path="/app/patients">{() => <Protected component={PatientRegistry} />}</Route>
      <Route path="/patients/:id">{() => <Protected component={PatientDetails} />}</Route>
      <Route path="/app/patients/:id">{() => <Protected component={PatientDetails} />}</Route>

      <Route path="/imaging">{() => <Protected component={ImagingViewer} />}</Route>
      <Route path="/app/imaging">{() => <Protected component={ImagingViewer} />}</Route>
      <Route path="/imaging/:id">{() => <Protected component={ImagingViewer} />}</Route>
      <Route path="/app/imaging/:id">{() => <Protected component={ImagingViewer} />}</Route>

      <Route path="/models">{() => <Protected component={AIModels} />}</Route>
      <Route path="/ai-analysis">{() => <Protected component={AIModels} />}</Route>
      <Route path="/app/ai-analysis">{() => <Protected component={AIModels} />}</Route>

      <Route path="/segmentation">{() => <Protected component={Segmentation} />}</Route>
      <Route path="/app/segmentation">{() => <Protected component={Segmentation} />}</Route>
      <Route path="/segmentation/:id">{() => <Protected component={Segmentation} />}</Route>
      <Route path="/app/segmentation/:id">{() => <Protected component={Segmentation} />}</Route>

      <Route path="/reconstruction">{() => <Protected component={Reconstruction} />}</Route>
      <Route path="/app/reconstruction">{() => <Protected component={Reconstruction} />}</Route>
      <Route path="/reconstruction/:id">{() => <Protected component={Reconstruction} />}</Route>
      <Route path="/app/reconstruction/:id">{() => <Protected component={Reconstruction} />}</Route>

      <Route path="/planning">{() => <Protected component={SurgicalPlanning} />}</Route>
      <Route path="/app/planning">{() => <Protected component={SurgicalPlanning} />}</Route>
      <Route path="/planning/:id">{() => <Protected component={SurgicalPlanning} />}</Route>
      <Route path="/app/planning/:id">{() => <Protected component={SurgicalPlanning} />}</Route>

      <Route path="/reports">{() => <Protected component={Reports} />}</Route>
      <Route path="/app/reports">{() => <Protected component={Reports} />}</Route>
      <Route path="/reports/:id">{() => <Protected component={Reports} />}</Route>
      <Route path="/app/reports/:id">{() => <Protected component={Reports} />}</Route>

      <Route path="/analytics">{() => <Protected component={Analytics} />}</Route>
      <Route path="/app/analytics">{() => <Protected component={Analytics} />}</Route>

      <Route path="/settings">{() => <Protected component={Settings} />}</Route>
      <Route path="/app/settings">{() => <Protected component={Settings} />}</Route>

      <Route path="/app/live-pipeline">{() => <Protected component={LivePipeline} />}</Route>
      <Route path="/live-pipeline">{() => <Protected component={LivePipeline} />}</Route>

      {/* 404 Catch-All */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
