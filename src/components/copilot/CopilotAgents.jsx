import { Container, List, ListItem, ListItemText } from '@mui/material';

import agents from '../../copilot/agents.json';

export default function CopilotAgents() {
  return (
    <Container>
      <h3>Copilot Agents</h3>
      <List>
        {agents.map((a) => (
          <ListItem key={a.id}>
            <ListItemText primary={a.name} secondary={a.prompt} />
          </ListItem>
        ))}
      </List>
    </Container>
  );
}
