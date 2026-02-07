import { lazy } from 'react'
import authRoute from './authRoute'
import type { Routes } from '@/@types/routes'
import {IconChartBar, IconFileAnalytics, IconFocusCentered, IconHome, IconMessageChatbot, IconRouteAltLeft, IconSettings} from '@tabler/icons-react'

export const publicRoutes: Routes = [...authRoute]

export const protectedRoutes = [
  {
    key: 'home',
    path: '/home',
    icon: IconHome,
    title: 'Home',
    description: 'Explore what automo has to offer.',
    keywords: 'main dashboard overview welcome starting page landing',
    component: lazy(() => import('@/pages/main/Home')),
    authority: []
  },
  {
    key: 'settings',
    path: '/settings',
    icon: IconSettings,
    title: 'Settings',
    description: 'Manage account preferences, profile and security.',
    keywords: 'config password profile user account preferences edit update',
    component: lazy(() => import('@/pages/main/Settings')),
    authority: []
  },
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: IconChartBar,
    title: 'Registration Intelligence',
    description: "Analyse Singapore new car registration trends with our high-fidelity SARIMA v4.0 forecasting engine.",
    keywords: 'car vehicle singapore registration coe trends sarima forecast prediction analytics data visualisation automotive stats chart export pdf csv svg clipboard copy',
    component: lazy(() => import('@/pages/ts-forecast/Dashboard')),
    authority: []
  },
  {
    key: 'report',
    path: '/dashboard/report',
    icon: IconFileAnalytics,
    title: 'Executive Summaries',
    description: "Transform complex time-series data into readable stakeholder reports with AI-generated trend interpretation.",
    keywords: 'summary analytics stakeholder download pdf export analysis insights reporting time-series interpretation data',
    component: lazy(() => import('@/pages/ts-forecast/Report')),
    authority: []
  },
  {
    key: 'chatbot',
    path: '/chatbot',
    icon: IconMessageChatbot,
    title: 'Market Query API',
    description: "Ask natural language questions about registration metrics, dataset boundaries, and seasonal fluctuations.",
    keywords: 'ai assistant chat help gpt llm gemini chatbot support ask questions metrics natural language bot prompt',
    component: lazy(() => import('@/pages/chatbot/Chatbot')),
    authority: []
  },
  {
    key: 'detection',
    path: '/detection',
    icon: IconFocusCentered,
    title: "Vision Inspection",
    description: "Deep-learning neural network for automated vehicle classification and structural damage assessment.",
    keywords: 'cv computer vision damage vehicle car crash detection neural network deep learning images photo inspection automation',
    component: lazy(() => import('@/pages/detection/Detection')),
    authority: []
  }
]
