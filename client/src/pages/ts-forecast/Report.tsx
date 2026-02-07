import { useState, useEffect } from 'react';
import { 
    Paper, Text, Button, Group, ScrollArea, 
    Box, Alert, Stack, Container, Drawer,
    Textarea, Slider, Divider, ActionIcon, Tooltip
} from '@mantine/core';
import { 
    IconDownload, IconFileAnalytics, IconRefresh, IconCheck,
    IconInfoCircle, IconAlertTriangle, IconSettings,
    IconRotateDot
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import ReactMarkdown from 'react-markdown';
import { ForecastService } from '@/services/ForecastService';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';

// Auth Imports
import { useAppSelector } from '@/store';
import AuthorityCheck from '@/route/AuthorityCheck';

export default function Report() {
    const [markdown, setMarkdown] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [pdfLoading, setPdfLoading] = useState<boolean>(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    
    // --- New State for Model Config ---
    const [opened, { open, close }] = useDisclosure(false);
    const [systemPrompt, setSystemPrompt] = useState<string>("");
    const [temperature, setTemperature] = useState<number>(0.1);

    const userAuthority = useAppSelector((state) => state.auth.user.role);

    // Fetch defaults on mount
    useEffect(() => {
        const fetchDefaults = async () => {
            try {
                const defaults = await ForecastService.getReportConfig();
                setSystemPrompt(defaults.system_prompt);
                setTemperature(defaults.temperature);
            } catch (err) {
                console.error("Failed to load model defaults", err);
            }
        };
        fetchDefaults();
    }, []);

    const handleGenerate = async (refresh = false) => {
        setLoading(true);
        let fullText = ""; 
        try {
            // Pass the custom config to the stream service
            await ForecastService.getReportStream((chunk) => {
                fullText += chunk;
                setMarkdown(fullText);
            }, refresh, { system_prompt: systemPrompt, temperature });
        } catch (err) {
            notifications.show({ color: 'red', title: 'Error', message: 'Failed to generate report' });
        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    };

    const handleDownloadPdf = async () => {
        setPdfLoading(true);
        try {
            await ForecastService.downloadPdf(markdown);
            notifications.show({
                title: 'Report Generated',
                message: 'Your PDF is ready.',
                icon: <IconCheck size={18} />,
                color: 'blue',
            });
        } catch (err) {
            notifications.show({ color: 'red', title: 'Download Failed', message: 'Could not generate PDF' });
        } finally {
            setPdfLoading(false);
        }
    };

    const handleResetDefaults = async () => {
            try {
                const defaults = await ForecastService.getReportConfig();
                setSystemPrompt(defaults.system_prompt);
                setTemperature(defaults.temperature);
                
                notifications.show({
                    title: 'Reset Successful',
                    message: 'Model parameters restored to system defaults',
                    color: 'gray',
                    icon: <IconCheck size={16} />
                });
            } catch (err) {
                console.error("Failed to load model defaults", err);
                notifications.show({ 
                    color: 'red', 
                    title: 'Reset Failed', 
                    message: 'Could not fetch default configuration' 
                });
            }
    };

    useEffect(() => {
        if (!hasLoaded && systemPrompt) { handleGenerate(false); }
    }, [systemPrompt]);

    return (
        <Container size="xl" py="xl">
            <Drawer 
                opened={opened} 
                onClose={close} 
                title="Model Configuration" 
                position="right"
                size="xl"
            >
                <Stack gap="md">
                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={500}>System Instruction</Text>
                        <Button 
                            variant="subtle" 
                            color="gray" 
                            size="compact-xs" 
                            leftSection={<IconRotateDot size={14} />}
                            onClick={handleResetDefaults}
                        >
                            Reset to Defaults
                        </Button>
                    </Group>
                    <Textarea 
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.currentTarget.value)}
                        placeholder="Define the AI personality and rules..."
                        minRows={12}
                        autosize
                    />
                    
                    <Divider my="sm" label="Sampling Parameters" labelPosition="center" />
                    
                    <Box px="xs">
                        <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500}>Temperature</Text>
                            <Text size="xs" c="dimmed">{temperature}</Text>
                        </Group>
                        <Slider 
                            value={temperature}
                            onChange={setTemperature}
                            min={0}
                            max={1}
                            step={0.05}
                            marks={[
                                { value: 0, label: 'Strict' },
                                { value: 1, label: 'Creative' }
                            ]}
                            mb="xl"
                        />
                    </Box>

                    <Button fullWidth onClick={() => { handleGenerate(true); close(); }}>
                        Apply & Regenerate
                    </Button>
                </Stack>
            </Drawer>

            <Paper p="lg" withBorder radius="md" pos="relative" shadow="sm">
                {loading && !markdown && <LoadingScreen />}
                
                <Group justify="space-between" mb="md">
                    <Group>
                        <IconFileAnalytics size={28} color="var(--mantine-color-blue-6)" />
                        <Box>
                            <Text fw={700} size="lg">Strategic Analysis</Text>
                            <Text size="xs" c="dimmed">SARIMA Executive Summary • Jan 2016 – May 2025</Text>
                        </Box>
                    </Group>
                    
                    <Group>
                        <Tooltip label="Configure Model">
                            <ActionIcon variant="light" size="lg" onClick={open} disabled={loading}>
                                <IconSettings size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <AuthorityCheck userAuthority={userAuthority || []} authority={[]}>
                            <Button 
                                variant="subtle" 
                                leftSection={<IconRefresh size={16}/>} 
                                onClick={() => handleGenerate(true)}
                                disabled={loading || pdfLoading}
                            >
                                {loading ? "Analysing..." : "Re-run Analysis"}
                            </Button>
                        </AuthorityCheck>

                        <AuthorityCheck userAuthority={userAuthority || []} authority={[]}>
                            <Button 
                                variant="filled"
                                leftSection={<IconDownload size={16} />} 
                                onClick={handleDownloadPdf}
                                loading={pdfLoading}
                                disabled={!markdown || loading}
                            >
                                Download PDF
                            </Button>
                        </AuthorityCheck>
                    </Group>
                </Group>

                <ScrollArea h={600} offsetScrollbars scrollbarSize={6}>
                    {!markdown && !loading ? (
                        <Stack align="center" justify="center" py={100} gap="lg">
                            <Box style={{ textAlign: 'center' }}>
                                <IconInfoCircle size={48} color="var(--mantine-color-gray-4)" />
                                <Text fw={600} size="xl" mt="md">Ready to Analyze</Text>
                                <Text c="dimmed" maw={400}>
                                    Initialize the SARIMA executive summary.
                                </Text>
                            </Box>
                            
                            <AuthorityCheck userAuthority={userAuthority || []} authority={[]}>
                                <Button size="md" variant="outline" onClick={() => handleGenerate(true)}>
                                    Initialize AI Analysis
                                </Button>
                            </AuthorityCheck>
                        </Stack>
                    ) : (
                        <Box p="xl" className="mantine-typography">
                            {markdown && <ReactMarkdown>{markdown}</ReactMarkdown>}
                        </Box>
                    )}
                </ScrollArea>

                {markdown && (
                    <Alert 
                        variant="light" 
                        color="red" 
                        title="Decision Support Note" 
                        icon={<IconAlertTriangle size={18} />}
                        mb="xl"
                    >
                        <Text size="sm">
                            Statistical models are predictive and subject to macroeconomic variance. 
                        </Text>
                    </Alert>
                )}
            </Paper>
        </Container>
    );
}
