import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { DirectorDashboard } from './components/DirectorDashboard.tsx';
import { DepartmentHeadDashboard } from './components/DepartmentHeadDashboard.tsx';
import { DepartmentsView } from './components/DepartmentsView.tsx';
import { UsersView } from './components/UsersView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { DirectivesView } from './components/DirectivesView.tsx';
import { SuperAdminDashboard } from './components/SuperAdminDashboard.tsx';
import { Department } from './types/index.ts';
import { Building, ShieldCheck, Database, Building2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'departments' | 'heads' | 'users' | 'reports' | 'directives'>('dashboard');
  const [selectedDeptForDetail, setSelectedDeptForDetail] = useState<Department | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-900/50 mb-4 animate-pulse">
          <Building className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold">منصة المتابعة الإدارية للإقامة الجامعية</h2>
        <p className="text-xs text-slate-400 mt-1">جاري التحقق من الجلسة وقاعدة البيانات...</p>
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  const handleSelectDepartment = (dept: Department) => {
    setSelectedDeptForDetail(dept);
    setCurrentTab('departments');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col" dir="rtl">
      {/* Official Header */}
      <Header 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        isSidebarOpen={isSidebarOpen} 
      />

      {/* Main Body Area with Sidebar and Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab as any);
            setSelectedDeptForDetail(null);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            user.role === 'SUPER_ADMIN' ? (
              <SuperAdminDashboard />
            ) : user.role === 'DIRECTOR' ? (
              <DirectorDashboard 
                onSelectDepartment={handleSelectDepartment}
                onOpenUsersTab={() => setCurrentTab('users')}
                onOpenReportsTab={() => setCurrentTab('reports')}
                onOpenDirectivesTab={() => setCurrentTab('directives')}
              />
            ) : (
              <DepartmentHeadDashboard 
                onOpenDepartmentsList={() => setCurrentTab('departments')}
                onOpenReportsTab={() => setCurrentTab('reports')}
                onOpenDirectivesTab={() => setCurrentTab('directives')}
              />
            )
          )}

          {currentTab === 'directives' && (
            <DirectivesView 
              onBack={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView 
              onBack={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'departments' && (
            <DepartmentsView 
              selectedDept={selectedDeptForDetail}
              onBack={() => {
                setCurrentTab('dashboard');
                setSelectedDeptForDetail(null);
              }}
            />
          )}

          {currentTab === 'heads' && (
            user.role === 'SUPER_ADMIN' ? (
              <SuperAdminDashboard initialTab="heads" />
            ) : (
              <UsersView 
                onBack={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'users' && (
            <UsersView 
              onBack={() => setCurrentTab('dashboard')}
            />
          )}
        </main>
      </div>

      {/* Official Administrative Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-4 sm:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">منصة المتابعة الإدارية للإقامة الجامعية</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">الإدارة المركزية ورؤساء المصالح</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Database className="w-3.5 h-3.5" />
              <span>قاعدة بيانات نشطة (SQLite + Express API)</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-400 font-bold bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">المرحلة 3.5: نظام متعدد المديريات Multi-Tenant SaaS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
