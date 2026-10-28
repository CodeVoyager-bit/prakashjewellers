import { createAuthClient } from "better-auth/react";

// Same-origin: talks to /api/auth, where the login rate limit applies.
export const authClient = createAuthClient();
