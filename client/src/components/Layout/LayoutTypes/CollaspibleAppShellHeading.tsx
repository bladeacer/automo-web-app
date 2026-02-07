import { useEffect, useState } from 'react';
import { UnstyledButton, Group, Text, rem } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { spotlight } from '@mantine/spotlight';
import { GlobalSearch } from '@/pages/main/Search';
import classes from './Heading.module.css';

export default function CollapsibleAppShellHeading() {
  const [shortcut, setShortcut] = useState('K');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMac = /macintosh|mac os x|ipad|iphone|ipod/.test(userAgent);
    
    setShortcut(isMac ? '⌘K' : 'Ctrl+K');
  }, []);

  return (
    <>
      <GlobalSearch />

      <UnstyledButton 
        className={classes.searchTrigger} 
        onClick={() => spotlight.open()}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <IconSearch 
              style={{ width: rem(16), height: rem(16) }} 
              stroke={2} 
            />
            <Text size="sm" c="dimmed" fw={500}>
              Search Automo...
            </Text>
          </Group>
          
          <div className={classes.shortcutHint}>
            {shortcut}
          </div>
        </Group>
      </UnstyledButton>
    </>
  );
}
