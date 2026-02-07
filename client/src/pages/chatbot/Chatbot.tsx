import { useState } from 'react';
import { 
  Container, Paper, Title, Text, FileInput, Button, 
  Stack, Group, Badge, Box, Center, ActionIcon, Tooltip
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { yupResolver } from 'mantine-form-yup-resolver';
import * as yup from 'yup';
import { 
  IconFileSpreadsheet, IconRobot, IconAlertTriangle, 
  IconCheck, IconInfoCircle 
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Services and Components
import { OrderService, ReorderPrediction } from '@/services/OrderService';
import DataTable from "@/components/Common/DataTable";

export default function Chatbot() {
  const [loading, setLoading] = useState<boolean>(false);
  const [predictions, setPredictions] = useState<ReorderPrediction[]>([]);

  const schema = yup.object().shape({
    csvFile: yup.mixed().required('Please upload a CSV file to analyze'),
  });

  const form = useForm({
    initialValues: {
      csvFile: null as File | null,
    },
    validate: yupResolver(schema),
  });

  const tableColumns: {
    header: string;
    accessor: keyof ReorderPrediction;
    render?: (item: ReorderPrediction) => React.ReactNode;
    sortable?: boolean;
    searchableValue?: (item: ReorderPrediction) => string;
  }[] = [
    {
      header: 'Part Number',
      accessor: 'partno',
      sortable: true,
      render: (item) => <Text size="xs" ff="monospace" fw={700}>{item.partno}</Text>
    },
    {
      header: 'Description',
      accessor: 'part_name',
      sortable: true,
    },
    {
      header: 'Stock',
      accessor: 'stock',
      sortable: true,
      render: (item) => <Text ta="center">{item.stock}</Text>
    },
    {
      header: 'Reorder Qty',
      accessor: 'reorder_qty',
      sortable: true,
      render: (item) => (
        <Center>
          {item.reorder_qty > 0 ? (
            <Badge color="red" variant="filled" size="lg">+{item.reorder_qty}</Badge>
          ) : (
            <Badge color="gray" variant="outline">0</Badge>
          )}
        </Center>
      )
    },
    {
      header: 'AI Recommendation',
      accessor: 'genai_message',
      sortable: false,
      render: (item) => (
        <Group gap="xs" wrap="nowrap">
          {item.reorder_qty > 0 ? (
            <IconAlertTriangle size={18} color="var(--mantine-color-orange-filled)" />
          ) : (
            <IconCheck size={18} color="var(--mantine-color-green-filled)" />
          )}
          <Text size="xs" c="dimmed" style={{ maxWidth: '300px', lineHeight: 1.2 }}>
            {item.genai_message}
          </Text>
        </Group>
      )
    }
  ];

  const handleProcessOrder = async () => {
    const validation = form.validate();
    if (validation.hasErrors) return;

    setLoading(true);
    try {
      const data = await OrderService.predictReorder(form.values.csvFile!);
      
      if (data.length === 0) {
        notifications.show({
          title: 'Empty Result',
          message: 'No reorder data could be generated from this file.',
          color: 'orange',
        });
      } else {
        setPredictions(data);
        notifications.show({
          title: 'Analysis Successful',
          message: `Generated AI insights for ${data.length} items.`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      }
    } catch (e: any) {
      notifications.show({
        title: 'Analysis Failed',
        message: 'There was an error processing the CSV.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper shadow="xs" p="xl" withBorder radius="md">
          <Stack gap="md" align="center">
            <Group gap="xs">
              <IconRobot size={32} color="blue" />
              <Title order={2}>Inventory Reorder Bot</Title>
            </Group>
            
            <Box w="100%" style={{ maxWidth: 500 }}>
              <FileInput
                label="Upload Inventory CSV"
                description="Requires 'supersedeno', 'description', and 'qty' columns"
                placeholder="Click to attach .csv"
                accept=".csv"
                leftSection={<IconFileSpreadsheet size={18} />}
                {...form.getInputProps('csvFile')}
                onChange={(file) => {
                  form.setFieldValue('csvFile', file);
                  setPredictions([]); 
                }}
              />
              <Button
                fullWidth
                mt="md"
                size="md"
                loading={loading}
                onClick={handleProcessOrder}
                leftSection={<IconRobot size={20} />}
              >
                Analyze Inventory
              </Button>
            </Box>
          </Stack>
        </Paper>

        {predictions.length > 0 && (
          <Paper shadow="xs" withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
            <Box p="md" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
              <Group justify="space-between">
                <Title order={4}>AI-Generated Procurement Advice</Title>
                <Tooltip label="Predictions based on demand vs safety stock">
                  <ActionIcon variant="subtle" color="gray">
                    <IconInfoCircle size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Box>
            
            {/* Added Generic Type Here */}
            <DataTable<ReorderPrediction> 
              data={predictions} 
              columns={tableColumns}
            />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
