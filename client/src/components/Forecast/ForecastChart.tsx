import {
  Box
} from '@mantine/core'
import { memo } from 'react';
import { LineChart } from '@mantine/charts';

const ForecastChart = memo(({ data, series, curveType, loading }: any) => {
  return (
    <Box pos="relative">
      <LineChart
        h={400}
        data={data}
        dataKey="month"
        series={series}
        curveType={curveType}
        withLegend
        legendProps={{ verticalAlign: 'bottom', height: 40 }}
        gridAxis="xy"
        strokeWidth={2}
        dotProps={{ r: 0 }}
        activeDotProps={{ r: 4, strokeWidth: 1 }}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if data length, curve type, or loading state changes
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.curveType === nextProps.curveType &&
    prevProps.loading === nextProps.loading &&
    prevProps.series === nextProps.series
  );
});

export default ForecastChart;
