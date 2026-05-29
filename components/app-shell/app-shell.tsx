import { ConfirmProvider } from "@/components/ui/confirm-provider";

import { AppMain } from "./app-main";
import { IdleSessionGuard } from "./idle-session-guard";
import { Sidebar } from "./sidebar";
import { StatusBar } from "./status-bar";
import { TopBar } from "./top-bar";

export type { RecentAffaireSidebarItem } from "@/lib/affaires/recent-sidebar";

export type AppShellData = {
  initials: string;
  displayName: string;
  email: string;
  titreLabel: string | null;
  cabinetName: string | null;
  /** Propriétaire légal du cabinet (`cabinets.owner_id`). */
  isCabinetOwner: boolean;
  sources: number;
  chunks: number;
  recentAffaires: RecentAffaireSidebarItem[];
};

type AppShellProps = {
  data: AppShellData;
  children: React.ReactNode;
};

export function AppShell({ data, children }: AppShellProps) {
  return (
    <ConfirmProvider>
      <IdleSessionGuard />
      <div className="adili-workspace grid h-[100dvh] grid-rows-[auto_1fr_auto] bg-brand-parchment text-foreground">
        <TopBar
          initials={data.initials}
          displayName={data.displayName}
          email={data.email}
          titreLabel={data.titreLabel}
          cabinetName={data.cabinetName}
          isCabinetOwner={data.isCabinetOwner}
        />
        <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[auto_1fr]">
          <Sidebar recentAffaires={data.recentAffaires} />
          <AppMain>{children}</AppMain>
        </div>
        <StatusBar sources={data.sources} chunks={data.chunks} />
      </div>
    </ConfirmProvider>
  );
}
