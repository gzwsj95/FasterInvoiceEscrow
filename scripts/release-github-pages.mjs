import { mkdtemp, readFile, rm, writeFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

const VERSION_KINDS = new Set(["patch", "minor", "major"]);
const rootFiles = ["package.json", "package-lock.json"];

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")));
const bumpArg = args.find((arg) => !arg.startsWith("--")) || "patch";
const dryRun = flags.has("--dry-run");
const skipBump = flags.has("--skip-bump");
const skipBuild = flags.has("--skip-build");
const skipDeploy = flags.has("--skip-deploy");

const optionValue = (name, fallback) => {
  const index = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (index === -1) return fallback;
  const direct = args[index].split("=")[1];
  return direct || args[index + 1] || fallback;
};

const remoteName = optionValue("--remote", process.env.GITHUB_PAGES_REMOTE || "origin");
const branchName = optionValue("--branch", process.env.GITHUB_PAGES_BRANCH || "gh-pages");
const commitMessageArg = optionValue("--message", "");

function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump;
  if (!VERSION_KINDS.has(bump)) {
    throw new Error(`Unsupported version bump "${bump}". Use patch, minor, major, or an exact x.y.z version.`);
  }

  const [major, minor, patch] = current.split(".").map((part) => Number.parseInt(part, 10));
  if ([major, minor, patch].some((part) => Number.isNaN(part))) {
    throw new Error(`Current package version "${current}" is not a simple semantic version.`);
  }

  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function updateVersions(version) {
  const packageJson = await readJson("package.json");
  packageJson.version = version;
  await writeJson("package.json", packageJson);

  if (existsSync("package-lock.json")) {
    const lock = await readJson("package-lock.json");
    lock.version = version;
    if (lock.packages?.[""]) {
      lock.packages[""].version = version;
    }
    await writeJson("package-lock.json", lock);
  }
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      env: process.env,
      shell: process.platform === "win32",
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      cwd: options.cwd || process.cwd()
    });

    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("exit", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with code ${code}\n${stderr.trim()}`));
    });
  });
}

async function preparePagesDirectory() {
  if (!existsSync("dist/index.html")) {
    throw new Error("dist/index.html does not exist. Run the build step before publishing.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "fie-github-pages-"));
  await cp("dist", tempDir, { recursive: true });
  await writeFile(join(tempDir, ".nojekyll"), "");
  await cp(join(tempDir, "index.html"), join(tempDir, "404.html"));
  return tempDir;
}

async function publishToGitHubPages(version) {
  const remoteUrl = await run("git", ["config", "--get", `remote.${remoteName}.url`], { capture: true });
  if (!remoteUrl) {
    throw new Error(`Git remote "${remoteName}" is not configured.`);
  }

  const tempDir = await preparePagesDirectory();
  const commitMessage = commitMessageArg || `Deploy Faster Invoice Escrow ${version}`;

  try {
    await run("git", ["init"], { cwd: tempDir });
    await run("git", ["checkout", "-B", branchName], { cwd: tempDir });
    await run("git", ["config", "user.name", "FIE Release Bot"], { cwd: tempDir });
    await run("git", ["config", "user.email", "release@local.invalid"], { cwd: tempDir });
    await run("git", ["add", "-A"], { cwd: tempDir });
    await run("git", ["commit", "-m", commitMessage], { cwd: tempDir });
    await run("git", ["remote", "add", remoteName, remoteUrl], { cwd: tempDir });
    await run("git", ["push", "--force", remoteName, `${branchName}:${branchName}`], { cwd: tempDir });
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

const packageJson = await readJson("package.json");
const targetVersion = skipBump ? packageJson.version : nextVersion(packageJson.version, bumpArg);

console.log("FIE GitHub Pages release");
console.log(skipBump ? `Version: ${targetVersion} (unchanged)` : `Version: ${packageJson.version} -> ${targetVersion}`);
console.log(`Remote: ${remoteName}`);
console.log(`Branch: ${branchName}`);

if (dryRun) {
  console.log("Dry run only. No files changed, no build executed, and no deploy pushed.");
  process.exit(0);
}

if (!skipBump) {
  await updateVersions(targetVersion);
  console.log(`Updated ${rootFiles.filter((file) => existsSync(file)).join(" and ")}.`);
}

if (!skipBuild) {
  await run("npm", ["run", "build"]);
}

if (!skipDeploy) {
  await publishToGitHubPages(targetVersion);
}

console.log(`GitHub Pages release ${targetVersion} complete.`);
