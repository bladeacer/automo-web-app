import { 
    Title, Text, Container, SimpleGrid, Paper, 
    ThemeIcon, UnstyledButton, Group, Stack, rem, Box, 
    NavLink
} from "@mantine/core";
import { 
    IconChartBar, IconFileAnalytics, IconFocusCentered,
    IconArrowRight, IconMessageChatbot, IconSparkles,
    IconRouteAltLeft, IconPresentationAnalytics
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store";
import AuthorityCheck from "@/route/AuthorityCheck";
import classes from "./home.module.css";

const linkItems = [
    {
        title: "Registration Intelligence",
        description: "Analyse Singapore new car registration trends with our high-fidelity SARIMA v4.0 forecasting engine.",
        icon: IconChartBar,
        color: "blue",
        path: "/dashboard",
        authority: []
    },
    {
        title: "Executive Summaries",
        description: "Transform complex time-series data into readable stakeholder reports with AI-generated trend interpretation.",
        icon: IconFileAnalytics,
        color: "teal",
        path: "/dashboard/report",
        authority: []
    },
    {
        title: "Market Query AI",
        description: "Ask natural language questions about registration metrics, dataset boundaries, and seasonal fluctuations.",
        icon: IconMessageChatbot,
        color: "indigo",
        path: "/chatbot",
        authority: []
    },
    {
        title: "Vision Inspection",
        description: "Deep-learning neural network for automated vehicle classification and structural damage assessment.",
        icon: IconFocusCentered,
        color: "orange",
        path: "/detection",
        authority: []
    }
];

const analytics = {
    title: "System Observability",
    description: "Monitor platform performance and user engagement insights via GoatCounter Analytics",
    icon: IconPresentationAnalytics,
    color: "violet",
    path: "http://localhost:8081",
    authority: []
}

export default function Home() {
    const navigate = useNavigate();
    const userAuthority = useAppSelector((state) => state.auth.user.role);

    const items = linkItems.map((item) => (
        <AuthorityCheck userAuthority={userAuthority ? userAuthority : []} authority={item.authority} key={item.title}>
            <Paper 
                withBorder 
                radius="md" 
                shadow="sm" 
                className={classes.card}
            >
                <UnstyledButton 
                    onClick={() => navigate(item.path)}
                    p="xl"
                    style={{ width: '100%', height: '100%' }}
                >
                    <ThemeIcon color={item.color} variant="light" size={44} radius="md">
                        <item.icon style={{ width: rem(26), height: rem(26) }} stroke={1.5} />
                    </ThemeIcon>

                    <Text size="lg" mt="sm" fw={700}>
                        {item.title}
                    </Text>

                    <Text size="sm" c="dimmed" mt={4} lh={1.5}>
                        {item.description}
                    </Text>

                    <Group justify="flex-end" mt="md">
                        <IconArrowRight size={16} color="var(--mantine-color-dimmed)" />
                    </Group>
                </UnstyledButton>
            </Paper>
        </AuthorityCheck>
    ));

    return (
        <Container size="lg" py={60}>
            {/* Banner Section */}
            <Box className={classes.banner}>
                <IconSparkles size={180} className={classes.bannerIcon} />
                <Stack align="center" gap={0} className={classes.bannerContent}>
                    <Title c="white" order={2} size={rem(36)} fw={900} lts={-1}>
                        Automo Intelligence
                    </Title>
                    <Text c="white" fw={600} lts={1.5} size="sm" tt="uppercase" opacity={0.8}>
                        Predictive Analytics for the Automotive Sector
                    </Text>
                </Stack>
            </Box>

            {/* Introductory Text */}
            <Stack align="center" gap="xs" mb={50}>
                <Title order={1} fw={900} size={rem(24)} style={{ textAlign: 'center', letterSpacing: '-1.5px' }}>
                    Unified Market Intelligence
                </Title>
                <Text c="dimmed" size="lg" maw={640} style={{ textAlign: 'center' }} lh={1.6}>
                    Leveraging <Text span c="blue" fw={700}>SARIMA v4.0</Text> to decode Singapore's vehicle sector.
                    Select a module below to begin your data-driven analysis.
                </Text>
            </Stack>

            {/* Navigational Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                {items}
                <AuthorityCheck userAuthority={userAuthority ? userAuthority : []} authority={analytics.authority} key={analytics.title}>
                    <Paper 
                        withBorder 
                        radius="md" 
                        shadow="sm" 
                        className={classes.card}
                    >
                        <UnstyledButton
                            onClick={() => navigate(analytics.path)}
                            p="xl"
                            style={{ width: '100%', height: '100%' }}
                        >
                            <ThemeIcon color={analytics.color} variant="light" size={44} radius="md">
                                <analytics.icon style={{ width: rem(26), height: rem(26) }} stroke={1.5} />
                            </ThemeIcon>

                            <Text size="lg" mt="sm" fw={700}>
                                {analytics.title}
                            </Text>

                            <Text size="sm" c="dimmed" mt={4} lh={1.5}>
                                {analytics.description}
                            </Text>

                            <Group justify="flex-end" mt="md">
                                <IconArrowRight size={16} color="var(--mantine-color-dimmed)" />
                            </Group>
                        </UnstyledButton>
                    </Paper>
                </AuthorityCheck>
            </SimpleGrid>
        </Container>
    );
}
