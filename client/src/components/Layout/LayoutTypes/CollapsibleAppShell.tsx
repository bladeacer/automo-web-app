import { AppShell, Box, Burger, Group, Text} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import navigationConfig from '@/configs/navigation.config';
import AuthorityCheck from '@/route/AuthorityCheck';
import { LinksGroup } from '@/components/Layout/LinksGroup';
import { Link, useNavigate } from 'react-router-dom';
import classes from '@/components/Layout/LayoutTypes/SimpleSideBar.module.css';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { useTranslation } from 'react-i18next';
import { IconBulb } from '@tabler/icons-react';
import Views from '@/components/Layout/Views';
import CollapsibleAppShellBottomContent from '@/components/Layout/LayoutTypes/CollapsibleAppShellBottomContent';
import CollapsibleAppShellHeading from './CollaspibleAppShellHeading';

export default function CollapsibleAppShell() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const userAuthority = useAppSelector((state) => state.auth.user.role);
  const [active, setActive] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const currentPath = location.pathname.split('/')[1];
    setActive(currentPath);
  }, [location.pathname]);

  const links = navigationConfig.map((item, index) => {
    let links = [];

    if (item.subMenu && item.subMenu.length > 0) {
      links = item.subMenu.map((i) => ({
        label: i.title,
        link: i.path,
        authority: i.authority,
      }));
      const isAnyLinkActive = links.some((link) => location.pathname.includes(link.link));

      return (
        <AuthorityCheck userAuthority={userAuthority || []} authority={item.authority} key={index}>
          <Box ml={10} my={10}>
            <LinksGroup
              initiallyOpened={isAnyLinkActive}
              icon={item.icon}
              label={item.title}
              links={links}
            />
          </Box>
        </AuthorityCheck>
      );
    } else {
      return (
        <AuthorityCheck userAuthority={userAuthority || []} authority={item.authority} key={index}>
          <Link
            className={classes.link}
            data-active={item.path.split('/')[1] === active ? 'true' : undefined}
            to={item.path}
            onClick={(event) => {
              event.preventDefault();
              setActive(item.path.split('/')[1]);
              navigate(item.path);
            }}
          >
            <item.icon className={classes.linkIcon} stroke={1.5} />
            <span>{item.translateKey ? t(item.translateKey) : item.title}</span>
          </Link>
        </AuthorityCheck>
      );
    }
  });

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="sm" justify="space-between" pos="relative">
          <Group h="100%">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm"/>
            
            <Group gap="xs" visibleFrom="xs">
              <IconBulb size={24} color="var(--mantine-color-blue-6)" /> 
              <Text fw={800} size="lg" lts={-0.5}>Automo</Text>
            </Group>
          </Group>

          <CollapsibleAppShellHeading />

          <Group px="md">
            {/* Right side utilities can go here */}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>{links}</AppShell.Section>
        <AppShell.Section>
          <CollapsibleAppShellBottomContent />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <div className={classes.mainContentWrapper}>
          <Views />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
