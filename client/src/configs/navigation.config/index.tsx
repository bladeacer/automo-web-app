import type { NavigationTree } from '@/@types/navigation';
import { 
  IconDashboard, IconFocusCentered, IconHome, IconMessageChatbot, 
  IconRouteAltLeft, IconSettings
} from '@tabler/icons-react';

const navigationConfig: NavigationTree[] = [
  {
    key: 'home',
    path: '/home',
    title: 'Home',
    translateKey: '',
    icon: IconHome,
    authority: [],
    subMenu: [],
  },
  {
    key: 'settings',
    path: '/settings',
    title: 'Settings',
    translateKey: '',
    icon: IconSettings,
    authority: [],
    subMenu: [],
  },
  {
    key: 'dashboard',
    path: '/dashboard',
    title: 'SARIMA v4',
    translateKey: '',
    icon: IconDashboard,
    authority: [],
    subMenu: [
      {
        key: 'dashboard',
        path: '/dashboard',
        title: 'Registration Intelligence',
        translateKey: '',
        authority: [],
      },
      {
        key: 'report',
        path: '/dashboard/report',
        title: 'Executive Summaries',
        translateKey: '',
        authority: [],
      },
    ],
  },
  {
    key: 'chatbot',
    path: '/chatbot',
    title: 'Market Query AI',
    translateKey: '',
    icon: IconMessageChatbot,
    authority: [],
    subMenu: [],
  },
  {
    key: 'detection',
    path: '/detection',
    title: 'Vision Inspection',
    translateKey: '',
    icon: IconFocusCentered,
    authority: [],
    subMenu: [],
  },
  {
    key: 'simulation',
    path: '/simulation',
    title: 'Supply Chain Sandbox',
    translateKey: '',
    icon: IconRouteAltLeft,
    authority: [],
    subMenu: [],
  },
];

export default navigationConfig;
