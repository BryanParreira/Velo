// Onboarding/login disabled — always go straight to app
export async function getOnboardingNeeded(): Promise<boolean> {
  return false;
}

export async function resolveShellEntryPath(): Promise<"/app/main"> {
  return "/app/main";
}

export async function resolveAppEntryPath(): Promise<
  "/app/main" | "/app/onboarding"
> {
  if (await getOnboardingNeeded()) {
    return "/app/onboarding";
  }

  return resolveShellEntryPath();
}

export function normalizeAppPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isShellEntryPath(pathname: string): boolean {
  const normalizedPath = normalizeAppPath(pathname);
  return normalizedPath === "/app" || normalizedPath === "/app/main";
}
