import { useState } from 'react';
import { 
    Button, TextInput, Stack, Title, Divider, 
    Text, Group, ThemeIcon, Box, SimpleGrid, Card 
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { 
    IconTrash, IconDeviceFloppy, IconUser, 
    IconMail, IconCircleCheck, 
    IconAlertTriangle
} from '@tabler/icons-react';
import { AuthService } from '@/services/auth/auth.service';
import { useAppSelector, setUser } from '@/store';
import { useDispatch } from 'react-redux';
import useAuth from '@/utils/hooks/useAuth';

export default function Settings() {
    const user = useAppSelector((state) => state.auth.user);
    const { signOut } = useAuth();
    const dispatch = useDispatch();

    // Mapping existing data safely
    const initialEmail = user?.email || '';
    const initialFullName = user?.fullName || '';

    const [email, setEmail] = useState(initialEmail);
    const [fullName, setFullName] = useState(initialFullName);
    const [loading, setLoading] = useState(false);

    // Only enable save if values actually changed
    const isDirty = email !== initialEmail || fullName !== initialFullName;

    const handleUpdate = async () => {
        if (!isDirty) return;
        setLoading(true);
        try {
            await AuthService.updateUser(initialFullName, { email, fullName });

            dispatch(setUser({
                ...user,
                email,
                fullName
            }));
            
            notifications.show({ 
                title: 'Profile Updated', 
                message: 'Your changes have been saved successfully.', 
                color: 'green',
                icon: <IconCircleCheck size={18} />
            });
        } catch (error) {
            notifications.show({ 
                title: 'Update Failed', 
                message: 'An error occurred while saving your profile.', 
                color: 'red' 
            });
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = () => 
        modals.openConfirmModal({
            title: <Text fw={700} size="lg">Delete Account</Text>,
            centered: true,
            children: (
                <Stack gap="sm">
                    <Text size="sm">
                        Are you sure you want to delete the account for <b>{initialFullName}</b>? 
                        This action is permanent and cannot be undone.
                    </Text>
                    <Box bg="red.0" p="xs" style={{ borderRadius: '4px', borderLeft: '3px solid var(--mantine-color-red-6)' }}>
                        <Text size="xs" c="red.9" fw={500}>
                            Warning: All reports, forecasts, and settings will be wiped from our servers.
                        </Text>
                    </Box>
                </Stack>
            ),
            labels: { confirm: 'Delete Account', cancel: 'Keep Account' },
            confirmProps: { color: 'red', variant: 'filled' },
            onConfirm: async () => {
                try {
                    await AuthService.deleteUser(initialFullName);
                    notifications.show({ 
                        title: 'Account Deleted', 
                        message: 'Your data has been removed.', 
                        color: 'gray' 
                    });
                    signOut();
                } catch (error) {
                    notifications.show({ 
                        title: 'Error', 
                        message: 'Failed to delete user.', 
                        color: 'red' 
                    });
                }
            },
        });

    return (
        <Stack gap="xl" maw={700} mx="auto" py="xl" px="md">
            {/* Header Section */}
            <Box>
                <Title order={2} fw={700}>Account Settings</Title>
                <Text c="dimmed" size="sm">Manage your profile information and account security.</Text>
            </Box>

            {/* Profile Information Card */}
            <Card withBorder padding="xl" radius="md" shadow="sm">
                <Group mb="lg">
                    <ThemeIcon variant="light" size="lg" color="blue">
                        <IconUser size={20} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={600} size="lg">Profile Information</Text>
                        <Text size="xs" c="dimmed">This information is visible to other members.</Text>
                    </Box>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput 
                        label="Full Name" 
                        placeholder="John Doe"
                        value={fullName} 
                        onChange={(e) => setFullName(e.currentTarget.value)} 
                        leftSection={<IconUser size={16} color="gray" />}
                    />
                    <TextInput 
                        label="Email Address" 
                        placeholder="john@example.com"
                        value={email} 
                        onChange={(e) => setEmail(e.currentTarget.value)} 
                        leftSection={<IconMail size={16} color="gray" />}
                    />
                </SimpleGrid>

                <Divider my="xl" variant="dashed" />

                <Group justify="flex-end">
                    <Button 
                        variant={isDirty ? "filled" : "light"}
                        color="blue"
                        leftSection={<IconDeviceFloppy size={18}/>} 
                        onClick={handleUpdate}
                        loading={loading}
                        disabled={!isDirty}
                    >
                        Save Changes
                    </Button>
                </Group>
            </Card>

            {/* Danger Zone Card */}
            <Card withBorder padding="xl" radius="md" style={{ borderLeft: '4px solid var(--mantine-color-red-6)' }}>
                <Group mb="md">
                    <ThemeIcon variant="light" size="lg" color="red">
                        <IconAlertTriangle size={20} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={600} size="lg" c="red.7">Danger Zone</Text>
                        <Text size="xs" c="dimmed">Actions here are permanent and cannot be undone.</Text>
                    </Box>
                </Group>

                <Stack gap="md">
                    <Box>
                        <Text size="sm" fw={500}>Delete Account</Text>
                        <Text size="xs" c="dimmed">
                            Once you delete your account, all associated data (reports, settings, forecasts) will be permanently wiped.
                        </Text>
                    </Box>
                    
                    <Group justify="flex-end">
                        <Button 
                            color="red" 
                            variant="outline" 
                            leftSection={<IconTrash size={18} />}
                            onClick={openDeleteModal}
                        >
                            Delete My Account
                        </Button>
                    </Group>
                </Stack>
            </Card>
        </Stack>
    );
}
