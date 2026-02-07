import { useState, useMemo } from 'react';
import { 
  Table, Pagination, Group, Text, Select, Stack, 
  ScrollArea, TextInput, UnstyledButton, Center 
} from '@mantine/core';
import { 
  IconSearch, IconSelector, IconChevronDown, IconChevronUp 
} from '@tabler/icons-react';
import Fuse from 'fuse.js';

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessor: keyof T;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    searchableValue?: (item: T) => string; 
  }[];
  initialPageSize?: number;
}

export default function DataTable<T>({ data, columns, initialPageSize = 10 }: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [activePage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<string | null>(initialPageSize.toString());
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const fuse = useMemo(() => {
    const searchableData = data.map((item) => {
      const searchFlatRow: any = { _original: item };
      
      columns.forEach(col => {
        const val = item[col.accessor];
        searchFlatRow[String(col.accessor)] = col.searchableValue 
          ? col.searchableValue(item) 
          : String(val ?? '');
      });

      return searchFlatRow;
    });

    return new Fuse(searchableData, {
      keys: columns.map(col => String(col.accessor)),
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [data, columns]);

  const processedData = useMemo(() => {
    let result = [...data];
    const cleanQuery = query.trim().replace(/,/g, '');
    
    if (cleanQuery.length >= 2) {
      result = fuse.search(cleanQuery).map(r => r.item._original);
    }

  if (sortBy) {
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return reverseSortDirection ? valB - valA : valA - valB;
      }

      const dateA = valA instanceof Date ? valA.getTime() : Date.parse(String(valA));
      const dateB = valB instanceof Date ? valB.getTime() : Date.parse(String(valB));

      if (!isNaN(dateA) && !isNaN(dateB)) {
        return reverseSortDirection ? dateB - dateA : dateA - dateB;
      }

      return reverseSortDirection 
        ? String(valB || '').localeCompare(String(valA || '')) 
        : String(valA || '').localeCompare(String(valB || ''));
    });
  }
    
    return result;
  }, [data, query, sortBy, reverseSortDirection, fuse]);

  const totalPages = Math.ceil(processedData.length / Number(pageSize));
  const paginatedData = processedData.slice(
    (activePage - 1) * Number(pageSize), 
    activePage * Number(pageSize)
  );

  const handleSort = (key: keyof T) => {
    setPage(1);

    if (sortBy === key) {
      if (reverseSortDirection) {
        setSortBy(null);
        setReverseSortDirection(false);
      } else {
        setReverseSortDirection(true);
      }
    } else {
      setSortBy(key);
      setReverseSortDirection(false);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" px="md" mt="md">
        <TextInput
          placeholder="Search items..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => { setQuery(e.currentTarget.value); setPage(1); }}
          w={300}
        />
      </Group>

      <ScrollArea h={400} type="always">
        <Table verticalSpacing="sm" highlightOnHover withTableBorder stickyHeader>
          <Table.Thead bg="gray.0">
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={String(col.accessor)}>
                  {col.sortable !== false ? (
                    <UnstyledButton onClick={() => handleSort(col.accessor)} w="100%">
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={700} size="sm">{col.header}</Text>
                        <Center>
                          {sortBy === col.accessor ? (
                            reverseSortDirection ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                          ) : (
                            <IconSelector size={14} stroke={1.5} />
                          )}
                        </Center>
                      </Group>
                    </UnstyledButton>
                  ) : (
                    <Text fw={700} size="sm">{col.header}</Text>
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, i) => (
                <Table.Tr key={i}>
                  {columns.map((col) => (
                    <Table.Td key={String(col.accessor)}>
                      {col.render ? col.render(item) : (item[col.accessor] as any)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : (
              <Table.Tr><Table.Td colSpan={columns.length}><Text ta="center" py="xl" c="dimmed">No results found</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Group justify="space-between" px="md" pb="md">
        <Select
          data={['10', '20', '50']}
          value={pageSize}
          onChange={(val) => { setPageSize(val); setPage(1); }}
          w={80}
          size="xs"
        />
        <Pagination total={totalPages} value={activePage} onChange={setPage} size="sm" />
      </Group>
    </Stack>
  );
}
