import {LayoutTypes} from "@/@types/layout";
import { API_BASE_URL } from "@/constants/api.constant";

export type AppConfig = {
  apiPrefix: string
  authenticatedEntryPath: string
  unAuthenticatedEntryPath: string
  enableMock: boolean
  locale: string
  layoutType: LayoutTypes,
}

const appConfig: AppConfig = {
  layoutType: LayoutTypes.CollapsibleAppShell,
  apiPrefix: API_BASE_URL,
  authenticatedEntryPath: '/home',
  unAuthenticatedEntryPath: '/sign-in',
  enableMock: false,
  locale: 'en',
}

export default appConfig
