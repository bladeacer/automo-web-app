import axios from 'axios';
import appConfig from '@/configs/app.config';
import { TOKEN_TYPE, REQUEST_HEADER_AUTH_KEY } from '@/constants/api.constant';
import { PERSIST_STORE_NAME } from '@/constants/app.constant';
import deepParseJson from '@/utils/deepParseJson';
import store, { signOutSuccess } from '../store';

const unauthorizedCode = [401];

const BaseService = axios.create({
  timeout: 60000,
  baseURL: appConfig.apiPrefix,
});

BaseService.interceptors.request.use(
    (config) => {
        const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME);
        const persistData = deepParseJson(rawPersistData);

        let accessToken = (persistData as any)?.auth?.session?.token;
        
        if (!accessToken) {
            const state: any = store.getState();
            accessToken = state.auth.session.token;
        }

        // Only attach the header if the token exists 
        // This prevents sending "Authorization: Bearer undefined"
        if (accessToken) {
            config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`;
        }

        // Ensure Content-Type is set for POST requests
        if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }

        return config;
    },
    (error) => Promise.reject(error)
);

BaseService.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    if (response && unauthorizedCode.includes(response.status)) {
      store.dispatch(signOutSuccess());
    }

    return Promise.reject(error);
  }
);

export default BaseService;
