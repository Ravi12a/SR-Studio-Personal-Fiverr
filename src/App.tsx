/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './lib/auth';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Gigs from './pages/Gigs';
import GigDetails from './pages/GigDetails';
import OrderForm from './pages/OrderForm';
import ClientDashboard from './pages/ClientDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentUpload from './pages/PaymentUpload';

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, userRole, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!user) return <Navigate to="/" />;
  
  if (requireAdmin && userRole !== 'admin') return <Navigate to="/dashboard" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
            <Navbar />
            <main className="flex-grow">
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/gigs" element={<Gigs />} />
              <Route path="/gig/:id" element={<GigDetails />} />
              <Route 
                path="/order/:id" 
                element={
                  <ProtectedRoute>
                    <OrderForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/payment/:orderId" 
                element={
                  <ProtectedRoute>
                    <PaymentUpload />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/*" 
                element={
                  <ProtectedRoute>
                    <ClientDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          <Toaster position="bottom-right" />
        </div>
      </Router>
    </AuthProvider>
    </HelmetProvider>
  );
}
