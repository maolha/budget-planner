import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { LoginForm } from "@/components/auth/LoginForm"
import { RegisterForm } from "@/components/auth/RegisterForm"
import { JoinFamily } from "@/components/auth/JoinFamily"
import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { IncomePage } from "@/components/income/IncomePage"
import { ExpensesPage } from "@/components/expenses/ExpensesPage"
import { StatementUploadPage } from "@/components/statements/StatementUploadPage"
import { AssetsPage } from "@/components/assets/AssetsPage"
import { TaxPage } from "@/components/taxes/TaxPage"
import { ForecastPage } from "@/components/forecasting/ForecastPage"
import { SettingsPage } from "@/components/settings/SettingsPage"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginForm />,
  },
  {
    path: "/register",
    element: <RegisterForm />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/income", element: <IncomePage /> },
          { path: "/expenses", element: <ExpensesPage /> },
          { path: "/statements", element: <StatementUploadPage /> },
          { path: "/assets", element: <AssetsPage /> },
          { path: "/taxes", element: <TaxPage /> },
          { path: "/forecasting", element: <ForecastPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/onboarding", element: <OnboardingWizard /> },
          { path: "/join", element: <JoinFamily /> },
        ],
      },
    ],
  },
])
