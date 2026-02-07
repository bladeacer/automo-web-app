import ApiService from "@/services/ApiService";

export interface DetectionResult {
  name: string;
  score: number;
}

export interface PredictResponse {
  result: DetectionResult[];
}

export interface InpaintResponse {
  image: string; // base64 string
}

export const DetectionService = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await ApiService.fetchData<null, { status: string }>({
        url: '/obj-det/health',
        method: 'GET',
      });
      return res.data.status === 'online';
    } catch {
      return false;
    }
  },
  async predictImage(file: File): Promise<PredictResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await ApiService.fetchData<FormData, PredictResponse>({
      url: '/obj-det/predictImage',
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  async inPaint(image: File, mask: File): Promise<InpaintResponse> {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("mask", mask);

    const res = await ApiService.fetchData<FormData, InpaintResponse>({
      url: '/obj-det/inpaint',
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};
