import BaseService from './BaseService';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { PERSIST_STORE_NAME } from '@/constants/app.constant';
import deepParseJson from '@/utils/deepParseJson';
import appConfig from '@/configs/app.config';

const ApiService = {
  fetchData<TReq, TRes>(config: AxiosRequestConfig<TReq>): Promise<AxiosResponse<TRes>> {
    return new Promise((resolve, reject) => {
      BaseService(config)
        .then((response: AxiosResponse<TRes>) => resolve(response))
        .catch((error: AxiosError) => reject(error));
    });
  },
  async fetchStream(url: string, onChunk: (text: string) => void): Promise<void> {
    // 1. Replicate Token Logic from BaseService
    const rawPersistData = localStorage.getItem(PERSIST_STORE_NAME);
    const persistData = deepParseJson(rawPersistData);
    const accessToken = (persistData as any)?.auth?.session?.token;

    const response = await fetch(`${appConfig.apiPrefix}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/event-stream, text/markdown',
      },
      mode: 'cors'
    });

    if (!response.ok) throw new Error(`Stream failed: ${response.statusText}`);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  }
};

export default ApiService;
