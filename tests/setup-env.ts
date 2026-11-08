import { config } from "dotenv";

// Same variables the app uses. Tests never print them.
config({ path: ".env.local", quiet: true });
