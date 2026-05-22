import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`Errand Buddy API running on http://localhost:${env.port}`);
});
