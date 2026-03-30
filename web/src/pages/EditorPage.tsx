import { Box } from '@mantine/core'

import { LiteGraphEditor } from '../editor/LiteGraphEditor'

export function EditorPage() {
  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <LiteGraphEditor />
    </Box>
  )
}
