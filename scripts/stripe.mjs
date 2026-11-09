// Runs the project's own Stripe CLI (tools/stripe), with its login saved in .stripe/
// instead of your user folder. Both are gitignored.
//   npm run stripe -- login
//   npm run stripe:listen
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const exe = join(root, "tools", "stripe", process.platform === "win32" ? "stripe.exe" : "stripe");
if (!existsSync(exe)) {
  console.error(`Stripe CLI not found at ${exe}. Download it from https://github.com/stripe/stripe-cli/releases into tools/stripe/.`);
  process.exit(1);
}
mkdirSync(join(root, ".stripe"), { recursive: true });
const child = spawn(exe, ["--config", join(root, ".stripe", "config.toml"), ...process.argv.slice(2)], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
