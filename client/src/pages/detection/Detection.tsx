import { useState, useEffect, useRef } from 'react';
import { 
  Container, Paper, Title, Text, FileInput, Button, 
  Image, Stack, Group, Divider, Badge, Box, Center
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { yupResolver } from 'mantine-form-yup-resolver';
import * as yup from 'yup';
import { IconUpload, IconWand, IconSearch, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DetectionService } from '@/services/DetectionService';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';

export default function Detection() {
  const [loading, setLoading] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [repairedImage, setRepairedImage] = useState<string | null>(null);
  const [isServiceOnline, setIsServiceOnline] = useState<boolean | null>(null);
  const [checkingInitialHealth, setCheckingInitialHealth] = useState<boolean>(true);
  const isOnlineRef = useRef(false);

  // Robust schema matching the SignIn pattern
  const schema = yup.object().shape({
    imageFile: yup.mixed().required('Please upload a car image to analyze'),
    maskFile: yup.mixed().nullable(),
  });

  const form = useForm({
    initialValues: {
      imageFile: null as File | null,
      maskFile: null as File | null,
    },
    validate: yupResolver(schema),
  });

  const handlePredict = async () => {
    // Validate specific field before API call
    const validation = form.validateField('imageFile');
    if (validation.hasError) return;

    setLoading(true);
    try {
      const data = await DetectionService.predictImage(form.values.imageFile!);
      setPredictions(data.result);
      
      notifications.show({
        title: 'Analysis Successful',
        message: 'Image processed and damage identified.',
        color: 'blue',
      });
    } catch (e: any) {
      notifications.show({
        title: 'Detection Error',
        message: 'An unexpected error occurred during analysis.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInpaint = async () => {
    // Check mask specifically for the repair step
    if (!form.values.maskFile) {
      form.setFieldError('maskFile', 'Please upload a mask image to repair');
      return;
    }

    setLoading(true);
    try {
      const data = await DetectionService.inPaint(
        form.values.imageFile!, 
        form.values.maskFile
      );
      setRepairedImage(`data:image/png;base64,${data.image}`);
      
      notifications.show({
        title: 'Repair Complete',
        message: 'The image has been successfully repaired.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (e: any) {
      notifications.show({
        title: 'Repair Error',
        message: 'Failed to process the repair request.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // If we're already marked as online (e.g. from a previous mount if using a global store), skip
    if (isOnlineRef.current) {
      setCheckingInitialHealth(false);
      setIsServiceOnline(true);
      return;
    }

    const verifyService = async () => {
      const online = await DetectionService.checkHealth();
      if (online) {
        isOnlineRef.current = true;
        setIsServiceOnline(true);
        setCheckingInitialHealth(false);
        // Successful check - the interval will be cleared by the cleanup or logic below
        return true;
      }
      return false;
    };

    // Initial immediate check
    verifyService().then((online) => {
      if (online) return; // Exit if already handled

      // Only set interval if the service was offline on first try
      const interval = setInterval(async () => {
        const nowOnline = await verifyService();
        if (nowOnline) {
          clearInterval(interval);
        }
      }, 2000); // 2-second polling for fast feedback

      return () => clearInterval(interval);
    });
  }, []);

  // Show LoadingScreen until the service is verified as online
  if (checkingInitialHealth || !isServiceOnline) {
    return <LoadingScreen />;
  }

  return (
    <Container size="sm" py="xl">
      <Paper shadow="sm" p="md" withBorder radius="md">
        <Stack gap="lg">
          <Title order={2} ta="center">Car Damage Analysis</Title>

          <Box>
            <Text fw={700} size="sm" mb={5}>1. Upload Car Image</Text>
            <FileInput 
              placeholder="Select car photo" 
              size="md"
              leftSection={<IconUpload size={16} />}
              {...form.getInputProps('imageFile')}
              onChange={(file) => {
                form.setFieldValue('imageFile', file);
                setPredictions([]);
                setRepairedImage(null);
              }}
            />
            <Button 
              fullWidth 
              mt="md" 
              size="md"
              leftSection={<IconSearch size={16} />}
              onClick={handlePredict}
              loading={loading && predictions.length === 0}
            >
              Identify Damage
            </Button>
          </Box>

          {form.values.imageFile && !form.errors.imageFile && (
            <Center>
              <Image 
                src={URL.createObjectURL(form.values.imageFile)} 
                radius="md" 
                w="70%"
                fit="contain"
                alt="Original preview" 
              />
            </Center>
          )}

          {predictions.length > 0 && (
            <Stack gap={6}>
              {predictions.map((res, i) => (
                <Paper key={i} p="xs" withBorder={i === 0} bg={i === 0 ? "green.0" : "gray.0"}>
                  <Group justify="space-between">
                    <Group gap="xs">
                      {i === 0 && <IconCheck size={14} color="green" />}
                      <Text size="sm" fw={i === 0 ? 700 : 400}>{res.name}</Text>
                    </Group>
                    <Badge color={i === 0 ? "green" : "gray"} variant="light">
                      {(res.score * 100).toFixed(2)}%
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}

          <Divider label="Repair Section" labelPosition="center" />

          <Box>
            <Text fw={700} size="sm" mb={5}>2. Upload Mask Image</Text>
            <FileInput 
              placeholder="Select mask photo" 
              size="md"
              leftSection={<IconUpload size={16} />}
              {...form.getInputProps('maskFile')}
              disabled={predictions.length === 0}
            />
            <Button 
              color="grape"
              fullWidth 
              mt="md" 
              size="md"
              leftSection={<IconWand size={16} />}
              onClick={handleInpaint}
              loading={loading && !!form.values.maskFile}
              disabled={predictions.length === 0}
            >
              Repair Damage
            </Button>
          </Box>

          {repairedImage && (
            <Stack gap="xs" mt="md" align='center'>
              <Title order={4} ta="center">Repaired Result</Title>
              <Image 
                src={repairedImage} 
                radius="md" 
                alt="Repaired output" 
                w="70%" 
                fit="contain"
              />
            </Stack>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
