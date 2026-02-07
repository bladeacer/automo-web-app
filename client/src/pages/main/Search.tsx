import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import Fuse from 'fuse.js';
import { protectedRoutes } from "@/configs/routes.config";
import { Spotlight } from '@mantine/spotlight';
import { Text, Badge, Center, Stack, rem, Highlight, Group, Box } from '@mantine/core';
import { IconFileSearch, IconChevronRight, IconHash, IconSearch } from '@tabler/icons-react';

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const userRole = useAppSelector((state) => state.auth.user.role) || [];

  const authorizedRoutes = useMemo(() => {
    return protectedRoutes.filter((route) => {
      if (!route.authority || route.authority.length === 0) return true;
      return route.authority.some((role) => userRole.includes(role));
    });
  }, [userRole]);

  const fuse = useMemo(() => {
    return new Fuse(authorizedRoutes, {
      keys: [
        { name: 'title', weight: 2.5 },
        { name: 'keywords', weight: 1.5 },   
        { name: 'description', weight: 0.8 }
      ],
      threshold: 0.3,
      ignoreLocation: true,
      findAllMatches: true,
      useExtendedSearch: true,
      ignoreFieldNorm: true,
      minMatchCharLength: 2,
    });
  }, [authorizedRoutes]);

  const filteredActions = useMemo(() => {
    if (query.trim().length === 0) return authorizedRoutes.slice(0, 5);
    return fuse.search(query).map(r => r.item);
  }, [query, fuse, authorizedRoutes]);

  return (
    <Spotlight.Root
      query={query}
      onQueryChange={setQuery}
      shortcut={['mod + K', '/']}
      radius="lg"
    >
      <Spotlight.Search
        placeholder="Search for car trends, AI help, or settings..."
        leftSection={<IconSearch size={20} stroke={1.5} />}
      />

      <Spotlight.ActionsList p="xs">
        {filteredActions.length > 0 ? (
          filteredActions.map((action) => {
            const ActionIcon = action.icon || IconFileSearch;

            return (
              <Spotlight.Action
                key={action.key}
                onClick={() => navigate(action.path)}
                p="md"
                m="xs"
                styles={{
                  action: {
                    width: filteredActions.length > 1 ? '590px' : '100%',
                    maxWidth: '100%',
                    marginInline: 'auto',
                    borderRadius: 'var(--mantine-radius-md)',
                    transition: 'background-color 150ms ease, width 200ms ease',
                    '&[data-selected]': {
                      backgroundColor: 'var(--mantine-color-blue-light)',
                      color: 'var(--mantine-color-blue-filled)',
                    },
                  },
                }}
              >
                <Group wrap="nowrap" align="flex-start" gap="md">
                  <Center 
                    w={44} 
                    h={44} 
                    bg="var(--mantine-color-gray-1)" 
                    c="blue.6" 
                    style={{ borderRadius: rem(8), flexShrink: 0 }}
                  >
                    <ActionIcon size={22} stroke={1.5} />
                  </Center>

                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" wrap="nowrap" mb={4}>
                      <Highlight 
                        highlight={query} 
                        size="sm" 
                        fw={700}
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {action.title}
                      </Highlight>
                      
                      <Badge variant="outline" size="xs" style={{ flexShrink: 0 }}>
                        PAGE
                      </Badge>
                    </Group>

                    <Highlight 
                      highlight={query}
                      size="xs" 
                      c="dimmed"
                      lineClamp={2}
                      highlightStyles={{ 
                         backgroundColor: 'transparent', 
                         fontWeight: 700, 
                         color: 'var(--mantine-color-blue-7)' 
                      }}
                    >
                      {action.description || ''}
                    </Highlight>

                    {action.keywords && (
                      <Group gap={6} mt={6} opacity={0.6} wrap="nowrap">
                        <IconHash size={11} style={{ flexShrink: 0 }} />
                        <Highlight 
                          highlight={query}
                          size="11px" 
                          fs="italic" 
                          highlightStyles={{ 
                            backgroundColor: 'transparent', 
                            fontWeight: 700, 
                            color: 'var(--mantine-color-blue-7)' 
                          }}
                        >
                          {action.keywords}
                        </Highlight>
                      </Group>
                    )}
                  </Box>

                  <Center h={44}>
                    <IconChevronRight 
                      size={18} 
                      stroke={1.5} 
                      style={{ opacity: 0.5 }} 
                    />
                  </Center>
                </Group>
              </Spotlight.Action>
            );
          })
        ) : (
          <Spotlight.Empty>
            <Stack align="center" gap="xs" py="xl">
              <Text c="dimmed" size="sm">No results found for "{query}"</Text>
            </Stack>
          </Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
}
