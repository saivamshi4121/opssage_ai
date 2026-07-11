import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { MainLayout } from "./components/Layout/MainLayout";
import { ClusterOverview } from "./pages/ClusterOverview";
import { IncidentDetail } from "./pages/IncidentDetail";
import { IncidentSearch } from "./pages/IncidentSearch";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { SlackIntegrationPage } from "./pages/SlackIntegrationPage";
import { SystemHealthPage } from "./pages/SystemHealthPage";
import { LandingPage } from "./pages/LandingPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { RunbooksPage } from "./pages/RunbooksPage";
import { CaseStudiesPage } from "./pages/CaseStudiesPage";
import { CaseStudyDetailPage } from "./pages/CaseStudyDetailPage";

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<MainLayout><ClusterOverview /></MainLayout>} />
      <Route path="/integrations" element={<IntegrationsPage />} />
      <Route path="/runbooks" element={<RunbooksPage />} />
      <Route path="/case-studies" element={<CaseStudiesPage />} />
      <Route path="/case-studies/:slug" element={<CaseStudyDetailPage />} />
      <Route path="/search" element={<MainLayout><IncidentSearch /></MainLayout>} />
      <Route path="/incidents/:id" element={<MainLayout><IncidentDetail /></MainLayout>} />
      <Route path="/health" element={<MainLayout><SystemHealthPage /></MainLayout>} />
      <Route path="/knowledge" element={<MainLayout><KnowledgeBasePage /></MainLayout>} />
      <Route path="/slack" element={<MainLayout><SlackIntegrationPage /></MainLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
