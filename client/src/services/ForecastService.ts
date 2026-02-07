import ApiService from "@/services/ApiService";

export interface ForecastItem {
    month: string;
    forecast: number;
    lower_ci: number;
    upper_ci: number;
}

export interface HistoryItem {
    month: string;
    actual: number;
}

export interface ForecastResponse {
    forecast: ForecastItem[];
    model_info: any;
}

export interface HistoryResponse {
    history: HistoryItem[];
    count: number;
}

export interface StreamOptions {
    system_prompt?: string,
    temperature?: number
}

export const ForecastService = {
    async getForecast(steps: number = 12): Promise<ForecastResponse> {
        const res = await ApiService.fetchData<null, ForecastResponse>({
            url: '/ts-model/forecast',
            method: 'GET',
            params: { steps }
        });
        return res.data;
    },
    
    async getHistory(): Promise<HistoryResponse> {
        const res = await ApiService.fetchData<null, HistoryResponse>({
            url: '/ts-model/history',
            method: 'GET'
        });
        return res.data;
    },

    async getMetrics(): Promise<any> {
        const res = await ApiService.fetchData<null, any>({
            url: '/ts-model/metrics',
            method: 'GET'
        });
        return res.data;
    },

    async getReportStream(
        onChunk: (text: string) => void, 
        refresh: boolean = false,
        options: StreamOptions = {}
    ): Promise<void> {
        // 1. Create base params with refresh
        const params = new URLSearchParams({
            refresh: String(refresh)
        });

        // 2. Append optional args if they exist
        if (options.system_prompt) {
            params.append('system_prompt', options.system_prompt);
        }
        if (options.temperature !== undefined) {
            params.append('temperature', String(options.temperature));
        }

        const endpoint = `/ts-model/report-stream?${params.toString()}`;
        
        try {
            await ApiService.fetchStream(endpoint, onChunk);
        } catch (error) {
            console.error("ForecastService.getReportStream failed:", error);
            throw error;
        }
    },

    async getReportConfig(): Promise<any> {
        const res = await ApiService.fetchData<null, any>({
            url: '/ts-model/report-defaults',
            method: 'GET'
        });
        return res.data;
    },

    async downloadPdf(markdown: string): Promise<void> {
        try {
            // Use the existing BaseService to handle tokens/interceptors automatically
            const response = await ApiService.fetchData<any, any>({
                url: '/ts-model/generate-pdf',
                method: 'POST',
                data: { markdown },
                responseType: 'blob',
                headers: {
                    // Ensure we override any sticky headers
                    'Content-Type': 'application/json',
                    'Accept': 'application/pdf'
                }
            });

            const blob = response.data;
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // This attribute is what triggers the "Save As" instead of "Open Tab"
            link.setAttribute('download', `Forecast_Report_${new Date().getTime()}.pdf`);
            
            // Append is required for Firefox
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 1000);

        } catch (error) {
            console.error("PDF Download failed", error);
            throw error;
        }
    },

    downloadCSV(data: any[], activeColumns: any[]) {
        if (!data.length || !activeColumns.length) return;

        const headers = activeColumns.map(col => col.header);

        const csvRows = data.map(item => {
            return activeColumns.map(col => {
                let value = '';

                const rawValue = item[col.accessor];

                if (col.accessor === 'date' || col.accessor === 'month') {
                    const dateObj = new Date(item.month || item.date);
                    value = dateObj.toLocaleString('en-UK', { month: 'long', year: 'numeric' });
                } 
                else if (col.header === 'Status') {
                    value = item.actual ? "Historical" : "Forecast";
                } 
                else if (col.accessor === 'forecast' || col.accessor === 'actual') {
                    value = (item.actual || item.forecast) || '0';
                } 
                else {
                    value = rawValue ? Math.round(rawValue).toString() : '';
                }

                return `"${value}"`;
            }).join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `forecast_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};
