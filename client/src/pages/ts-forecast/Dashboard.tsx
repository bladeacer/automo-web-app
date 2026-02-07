import { useEffect, useState, useMemo } from "react";
import { ForecastService, ForecastItem } from "@/services/ForecastService";
import { notifications } from "@mantine/notifications";
import { 
    Alert, Title, Container, Paper, Text, Grid, Stack, Group, 
    Slider, Box, SimpleGrid, Divider, Checkbox, Select,
    Button, Menu, Badge, List, ThemeIcon, SegmentedControl, Center
} from "@mantine/core";
import { useDebouncedValue } from '@mantine/hooks';
import { LineChartCurveType } from '@mantine/charts';
import { 
    IconCheck, IconInfoCircle, IconChartLine, IconAdjustmentsHorizontal, IconDownload,
    IconPhoto, IconFileTypeSvg, IconCopy,
    IconFileAnalytics, IconDatabase,
    IconBrandDocker, IconTable
} from "@tabler/icons-react";
import LoadingScreen from "@/components/LoadingScreen/LoadingScreen";
import ForecastChart from "@/components/Forecast/ForecastChart";
import DataTable from "@/components/Common/DataTable";
import { useRef } from "react";
import * as htmlToImage from 'html-to-image';
import { Link } from "react-router-dom";

export default function Dashboard() {
    // --- Data State ---
    const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- Control State ---
    const [steps, setSteps] = useState<number>(12);
    const [sliderValue, setSliderValue] = useState<number>(12);
    const [chartCurveType, setChartCurveType] = useState<LineChartCurveType>("monotone");
    const [showHistory, setShowHistory] = useState<boolean>(true);
    const [showBounds, setShowBounds] = useState<boolean>(true);

    const [debouncedSteps] = useDebouncedValue(steps, 400);
    const [view, setView] = useState<'chart' | 'table'>('chart');

    const handleStepChange = (val: number | string) => {
        const num = Math.min(Math.max(Number(val) || 1, 1), 48);
        setSteps(num);
        setSliderValue(num); // Keep slider in sync with manual input
    };
    const chartRef = useRef<HTMLDivElement>(null);
    const handleExport = async (type: 'jpg' | 'svg' | 'clipboard' | 'csv') => {
        // Branch 1: Data Export (CSV)
        if (type === 'csv') {
            try {
                ForecastService.downloadCSV(chartData, tableColumns);
                notifications.show({
                    title: 'Export Successful',
                    message: 'Data matches your current table view.',
                    color: 'teal',
                    icon: <IconCheck size={18} />,
                });
            } catch (error) {
                notifications.show({ title: 'Export Failed', message: 'Error generating CSV', color: 'red' });
            }
            return;
        }

        // Branch 2: Visual Export (JPG, SVG, Clipboard)
        if (!chartRef.current) return;

        try {
            const filter = (node: HTMLElement) => node.tagName !== 'BUTTON';
            const timestamp = Date.now();
            const fileName = `forecast-export-${timestamp}`;

            switch (type) {
                case 'jpg':
                    const jpgData = await htmlToImage.toJpeg(chartRef.current, { backgroundColor: '#fff', filter });
                const jpgLink = document.createElement('a');
                jpgLink.download = `${fileName}.jpg`;
                jpgLink.href = jpgData;
                jpgLink.click();
                break;

                case 'svg':
                    const svgData = await htmlToImage.toSvg(chartRef.current, { filter });
                const svgLink = document.createElement('a');
                svgLink.download = `${fileName}.svg`;
                svgLink.href = svgData;
                svgLink.click();
                break;

                case 'clipboard':
                    const blob = await htmlToImage.toBlob(chartRef.current, { filter });
                if (blob) {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    notifications.show({ title: 'Copied!', message: 'Image copied to clipboard', color: 'teal' });
                }
                break;
            }
        } catch (err) {
            notifications.show({ title: 'Export Error', message: 'Failed to capture visual data', color: 'red' });
        }
    };

    useEffect(() => {
        const fetchAndPrewarm = async () => {
            try {
                const [metricsRes, historyRes, initialForecast] = await Promise.all([
                    ForecastService.getMetrics(),
                    ForecastService.getHistory(),
                    ForecastService.getForecast(12)
                ]);
                setMetrics(metricsRes);
                setHistoryData(historyRes.history);
                setForecastData(initialForecast.forecast);

                // Silent pre-warm
                [24, 48].forEach(s => ForecastService.getForecast(s).catch(() => {}));
            } catch (err) {
                console.error("Initial load failed", err);
            }
        };
        fetchAndPrewarm();
    }, []);

    useEffect(() => {
        const fetchForecast = async () => {
            if (!debouncedSteps) return;
            try {
                setLoading(true);
                const response = await ForecastService.getForecast(Number(debouncedSteps));
                setForecastData(response.forecast);
                setError(null);
            } catch (err: any) {
                setError("Failed to fetch forecast data. Check Docker container logs.");
            } finally {
                setLoading(false);
            }
        };
        fetchForecast();
    }, [debouncedSteps]);

    // Memoized Chart Logic
    const chartData = useMemo(() => 
                              showHistory ? [...historyData, ...forecastData] : forecastData, 
    [historyData, forecastData, showHistory]);

    const chartSeries = useMemo(() => {
        const series = [
            { name: 'actual', color: 'teal.6', label: 'Historical' },
            { name: 'forecast', color: 'blue.6', label: 'Predicted' }
        ];
        if (showBounds) {
            series.push(
                { name: 'upper_ci', color: 'gray.4', label: 'Upper 95%' },
                { name: 'lower_ci', color: 'gray.4', label: 'Lower 95%' }
            );
        }
        return series;
    }, [showBounds]);

    const tableColumns = useMemo(() => {
        const cols = [
            { 
                header: 'Month/Year', 
                accessor: 'month', 
                sortable: true,
                searchableValue: (item: any) => new Date(item.month).toLocaleString('en-UK', { month: 'long', year: 'numeric' }),
                render: (item: any) => (
                    <Text size="sm" fw={500}>
                        {new Date(item.month).toLocaleString('en-UK', { month: 'long', year: 'numeric' })}
                    </Text>
                )
            },
            { 
                header: 'Status', 
                accessor: 'actual', 
                sortable: true,
                searchableValue: (item: any) => item.actual ? "Historical" : "Forecast",
                render: (item: any) => (
                    <Badge color={item.actual ? "teal" : "blue"} variant="light" size="sm">
                        {item.actual ? "Historical" : "Forecast"}
                    </Badge>
                )
            },
            { 
                header: 'Volume', 
                accessor: 'forecast', 
                sortable: true,
                render: (item: any) => (
                    <Text fw={700} size="sm">
                        {(item.actual || item.forecast)?.toLocaleString()}
                    </Text>
                )
            }
        ];

        if (showBounds) {
            cols.push(
                { 
                    header: 'Lower Bound (95%)', 
                    accessor: 'lower_ci', 
                    sortable: true,
                    render: (item: any) => (
                        <Text c="dimmed" size="xs">
                            {item.lower_ci ? Math.round(item.lower_ci).toLocaleString() : '—'}
                        </Text>
                    )
                },
                { 
                    header: 'Upper Bound (95%)', 
                    accessor: 'upper_ci', 
                    sortable: true,
                    render: (item: any) => (
                        <Text c="dimmed" size="xs">
                            {item.upper_ci ? Math.round(item.upper_ci).toLocaleString() : '—'}
                        </Text>
                    )
                }
            );
        }

        return cols;
    }, [showBounds]);

    return (
        <Container size="xl" py="xl">
            {/* Header Section */}
            <Group mb={30} justify="space-between" align="flex-end">
                <Stack gap={5}>
                    <Group gap="sm">
                        <IconChartLine size={32} color="var(--mantine-color-blue-6)" stroke={2.5} />
                        <Title order={1} fw={900} lts={-0.5}>New Car Registration Forecaster</Title>
                    </Group>
                    <Group gap="md" mt={2}>
                        <Text c="dimmed" size="sm" fw={500}>
                            Supervised Learning Analytics • Jan 2016 – May 2025
                        </Text>
                        <Divider orientation="vertical" />
                        <Badge variant="dot" color="blue" size="md" radius="sm">SARIMA Engine v4.0</Badge>
                    </Group>
                </Stack>

                <Group gap="sm">
                    <Button 
                        variant="filled"
                        size="md"
                        leftSection={<IconFileAnalytics size={20} />}
                        component={Link} 
                        to="/dashboard/report"
                        radius="md"
                    >
                        Generate Executive Report
                    </Button>
                    <Button 
                        variant="light"
                        size="md"
                        leftSection={<IconBrandDocker size={20} />}
                        component={Link} 
                        to="https://hub.docker.com/r/bladeacer/automo-ts"
                        radius="md"
                        target="_blank"
                    >
                        Docker Image
                    </Button>
                </Group>
            </Group>

            <Grid gutter="xl">
                {/* Left: Main Dashboard Area */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Stack gap="lg">
                        {/* Metrics Bar - Upgraded to Card Style */}
                        {metrics && (
                            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                                {Object.entries(metrics.metrics || {}).map(([key, val]: any) => (
                                    <Paper withBorder p="md" radius="md" key={key} shadow="xs">
                                        <Text size="sm" c="dimmed" tt="uppercase" fw={800} lts={1}>{key}</Text>
                                        <Text fw={900} size="xl" mt={2}>
                                            {val.toLocaleString(undefined, {maximumFractionDigits: 2})}
                                        </Text>
                                    </Paper>
                                ))}
                            </SimpleGrid>
                        )}

                        {/* Main Chart Card */}
                        <Paper withBorder p="xl" radius="md" pos="relative" shadow="xs">
                            {loading && <LoadingScreen />}
                            <Group justify="space-between" mb="xl">
                                <Box>
                                    <Text size="lg" fw={800}>Volume Projection</Text>
                                    <Text size="sm" c="dimmed">
                                        {view === 'chart' 
                                            ? `Predicted path for the next ${debouncedSteps} months` 
                                            : `Fuzzy search and sort through ${chartData.length} records`}
                                    </Text>
                                </Box>

                                <Group gap="sm">
                                    <SegmentedControl
                                        value={view}
                                        onChange={(value) => setView(value as 'chart' | 'table')}
                                        data={[
                                            { label: <Center p={4}><IconChartLine size={16} /> Chart</Center>, value: 'chart' },
                                            { label: <Center p={4}><IconTable size={16} /> Table</Center>, value: 'table' },
                                        ]}
                                        size="xs"
                                        radius="md"
                                    />

                                    <Menu shadow="md" width={200} position="bottom-end" withArrow>
                                        <Menu.Target>
                                            <Button
                                                variant="light"
                                                size="sm"
                                                rightSection={<IconDownload size={14} />}
                                                disabled={!chartData.length}
                                            >
                                                Export
                                            </Button>
                                        </Menu.Target>

                                        <Menu.Dropdown>
                                            <Menu.Label>Data</Menu.Label>
                                            <Menu.Item 
                                                leftSection={<IconTable size={14} />} 
                                                onClick={() => handleExport('csv')}
                                            >
                                                Export CSV
                                            </Menu.Item>

                                            <Menu.Divider />

                                            <Menu.Label>Save as</Menu.Label>
                                            <Menu.Item 
                                                leftSection={<IconPhoto size={14} />} 
                                                onClick={() => handleExport('jpg')}
                                            >
                                                JPG Image
                                            </Menu.Item>
                                            <Menu.Item 
                                                leftSection={<IconFileTypeSvg size={14} />} 
                                                onClick={() => handleExport('svg')}
                                            >
                                                SVG Vector
                                            </Menu.Item>

                                            <Menu.Item 
                                                leftSection={<IconCopy size={14} />} 
                                                onClick={() => handleExport('clipboard')}
                                            >
                                                Copy to Clipboard
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Group>
                            </Group>

                            <Box ref={chartRef} h={500}> 
                                {error ? (
                                    <Alert color="red" variant="light" icon={<IconInfoCircle />}>{error}</Alert>
                                ) : view === 'chart' ? (
                                    <ForecastChart
                                        data={chartData}
                                        series={chartSeries}
                                        curveType={chartCurveType}
                                        loading={loading}
                                    />
                                ) : (
                                    <DataTable 
                                        data={chartData} 
                                        columns={tableColumns}
                                    />
                                )}
                            </Box>
                        </Paper>
                    </Stack>
                </Grid.Col>

                {/* Right: Controls Sidebar */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Stack gap="lg">
                        <Paper withBorder p="xl" radius="md" shadow="xs">
                            <Group mb="lg" gap="sm">
                                <IconAdjustmentsHorizontal size={20} color="var(--mantine-color-blue-6)" />
                                <Text fw={800} size="md">Forecast Parameters</Text>
                            </Group>

                            <Stack gap="xl">
                                <Box>
                                    <Group justify="space-between" mb="sm">
                                        <Text size="sm" fw={600}>Projection Horizon</Text>
                                        <Badge variant="light" color="gray">{steps} Months</Badge>
                                    </Group>
                                    <Slider
                                        value={sliderValue}
                                        onChange={setSliderValue}
                                        onChangeEnd={handleStepChange}
                                        min={1}
                                        max={48}
                                        label={null}
                                        marks={[
                                            { value: 12, label: '1y' },
                                            { value: 24, label: '2y' },
                                            { value: 48, label: '4y' }
                                        ]}
                                        mb="xl"
                                    />
                                </Box>

                                <Divider label="Visual Preferences" labelPosition="center" />

                                <Select
                                    label="Curve Smoothing"
                                    description="Select interpolation method for data lines"
                                    data={['monotone', 'linear', 'step', 'natural']}
                                    value={chartCurveType}
                                    onChange={(v) => setChartCurveType(v as any)}
                                />

                                <Stack gap="sm">
                                    <Checkbox label="Show Historical Context" checked={showHistory} onChange={(e) => setShowHistory(e.currentTarget.checked)} />
                                    <Checkbox label="Confidence Intervals (95%)" checked={showBounds} onChange={(e) => setShowBounds(e.currentTarget.checked)} />
                                </Stack>
                            </Stack>
                        </Paper>

                        {/* Infrastructure Note */}
                        <Alert variant="light" color="blue" radius="md" icon={<IconDatabase size={16}/>}>
                            <Text size="sm" fw={700} mb={2}>High-Performance Caching</Text>
                            <Text size="sm" lh={1.4}>
                                KeyDB caching is active. Real-time SARIMA compute via Docker takes ~1.2s for uncached horizons.
                            </Text>
                        </Alert>
                    </Stack>
                </Grid.Col>

                {/* Bottom: Comprehensive Context */}
                <Grid.Col span={12}>
                    <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-gray-0)">
                        <Grid gutter="xl">
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Title order={4} mb="sm">Model Iteration v4.0</Title>
                                <Text size="sm" c="dimmed" lh={1.6}>
                                    v4 represents a major overhaul of our supervised learning pipeline. This version implements refined 
                                    Seasonal Auto-Regressive Integrated Moving Average (SARIMA) logic, specifically tuned for post-2021 market volatility 
                                    in car registration datasets.
                                </Text>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                    <List spacing="sm" size="sm" center icon={<ThemeIcon color="blue" size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>}>
                                        <List.Item><b>Seasonality</b>: Detects cyclic 12-month registration peaks.</List.Item>
                                        <List.Item><b>Drift Correction</b>: Accounts for long-term macroeconomic shifts.</List.Item>
                                    </List>
                                    <List spacing="sm" size="sm" center icon={<ThemeIcon color="blue" size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>}>
                                        <List.Item><b>Confidence</b>: 95th percentile variance calculation.</List.Item>
                                        <List.Item><b>Input Range</b>: High-fidelity data from Jan 2016 onward.</List.Item>
                                    </List>
                                </SimpleGrid>
                            </Grid.Col>
                        </Grid>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Container>
    );
}
