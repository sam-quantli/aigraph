import { Anchor, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <Stack p="md" gap="sm">
      <Title order={2}>Quantli - Workflow</Title>
      <Text c="dimmed">Open the graph editor from the sidebar or below.</Text>
      <Anchor component={Link} to="/editor">
        Go to editor
      </Anchor>
    </Stack>
  )
}
