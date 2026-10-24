import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { IntroSplash } from '@/components/effects/IntroSplash'

import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import GoogleCallback from '@/pages/GoogleCallback'
import Dashboard from '@/pages/Dashboard'
import Workout from '@/pages/Workout'
import Exercises from '@/pages/Exercises'
import Nutrition from '@/pages/Nutrition'
import Admin from '@/pages/Admin'
import Team from '@/pages/Team'
import ProgressPage from '@/pages/Progress'
import History from '@/pages/History'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'
import Equipment from '@/pages/Equipment'
import About from '@/pages/About'
import { MotivationNotification } from '@/components/ui/MotivationNotification'
import { GoogleTranslateBridge } from '@/components/ui/GoogleTranslateBridge'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <LanguageProvider>
          <GoogleTranslateBridge />
          <IntroSplash />{/* CHANGE: cinematic GYMAI intro, site appears after 4 s */}
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<GoogleCallback />} />

            <Route path="/onboarding" element={<Navigate to="/profile" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/workout" element={<ProtectedRoute><Workout /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowIncomplete><Admin /></ProtectedRoute>} />
            <Route path="/team" element={<Team />} />
            <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
            <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowIncomplete><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/about" element={<About />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          <MotivationNotification />
          </LanguageProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
