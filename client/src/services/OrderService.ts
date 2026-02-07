import ApiService from "@/services/ApiService";

export interface ReorderPrediction {
  partno: string;
  part_name: string;
  stock: number;
  reorder_qty: number;
  prediction: number;
  genai_message: string;
  dateStr?: string; 
  statusStr?: string;
}

export interface OrderErrorResponse {
  error: string;
}

export const OrderService = {
  /**
   * Uploads a CSV file to the reorder prediction model.
   * Returns a list of predictions or an empty array on failure.
   */
  async predictReorder(file: File): Promise<ReorderPrediction[]> {
    try {
      // Create FormData to handle file upload
      const formData = new FormData();
      formData.append("file", file);

      const res = await ApiService.fetchData<FormData, ReorderPrediction[]>({
        url: '/order-model/predict-reorder',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data || [];
    } catch (error: any) {
      const serverMsg = error?.response?.data?.error;
      console.error("OrderService.predictReorder failed:", serverMsg || error.message);
      
      return [];
    }
  }
};
