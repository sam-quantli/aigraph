import { AppShell, Burger, Group, NavLink, ScrollArea, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconHome, IconTopologyStar3 } from '@tabler/icons-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure()
  const location = useLocation()

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding={0}
      styles={{
        root: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh'
        },
        main: {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <AppShell.Header px="md" style={{ display: 'flex', alignItems: 'center' }}>
        <Group h="100%" justify="space-between" style={{ flex: 1 }}>
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={600}>aigraph</Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <ScrollArea style={{ height: '100%' }}>
          <NavLink
            component={Link}
            to="/"
            label="Home"
            leftSection={<IconHome size={18} stroke={1.5} />}
            active={location.pathname === '/'}
          />
          <NavLink
            component={Link}
            to="/editor"
            label="Editor"
            leftSection={<IconTopologyStar3 size={18} stroke={1.5} />}
            active={location.pathname === '/editor'}
          />
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
