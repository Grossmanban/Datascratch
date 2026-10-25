import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/auth/session";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RecoverPage } from "@/features/auth/RecoverPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { CalendarPage } from "@/features/calendar/CalendarPage";
import { DocPage } from "@/features/doc/DocPage";
import { AllDocsPage, FolderPage, NotebookPage, StarredPage, TagPage, TrashPage } from "@/features/docs/ListPages";
import { GuestPage } from "@/features/guest/GuestPage";
import { SettingsPage, type SettingsSection } from "@/features/settings/SettingsPage";
import { AppShell } from "@/features/shell/AppShell";
import { TasksPage, type TaskView } from "@/features/tasks/TasksPage";

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const authLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth",
  component: AuthLayout,
  beforeLoad: () => {
    const st = useAuth.getState();
    if (st.status === "ready" && !st.pendingRecoveryKey) throw redirect({ to: "/all" });
  },
});
const loginRoute = createRoute({ getParentRoute: () => authLayout, path: "/login", component: LoginPage });
const signupRoute = createRoute({ getParentRoute: () => authLayout, path: "/signup", component: SignupPage });
const recoverRoute = createRoute({ getParentRoute: () => authLayout, path: "/recover", component: RecoverPage });

const appLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppShell,
  beforeLoad: ({ location }) => {
    const st = useAuth.getState();
    if (st.status !== "ready") throw redirect({ to: "/login", search: { next: location.href } as never });
    if (st.pendingRecoveryKey) throw redirect({ to: "/signup" });
  },
});

const indexRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/all" });
  },
});

type ListSearch = { view?: "grid" | "list" };
const listSearch = (s: Record<string, unknown>): ListSearch => ({
  view: s.view === "list" || s.view === "grid" ? s.view : undefined,
});

const allRoute = createRoute({ getParentRoute: () => appLayout, path: "/all", component: AllDocsPage, validateSearch: listSearch });
const notebookRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/notebook/$notebookId",
  component: NotebookPage,
  validateSearch: listSearch,
});
const folderRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/folder/$folderId",
  component: FolderPage,
  validateSearch: listSearch,
});
const tagRoute = createRoute({ getParentRoute: () => appLayout, path: "/tag/$", component: TagPage, validateSearch: listSearch });
const starredRoute = createRoute({ getParentRoute: () => appLayout, path: "/starred", component: StarredPage, validateSearch: listSearch });
const trashRoute = createRoute({ getParentRoute: () => appLayout, path: "/trash", component: TrashPage, validateSearch: listSearch });
const tasksRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/tasks/$view",
  component: TasksPage,
  params: {
    parse: (p) => ({ view: (["inbox", "today", "upcoming", "all", "logbook"].includes(p.view) ? p.view : "today") as TaskView }),
    stringify: (p) => ({ view: p.view }),
  },
});
const tasksIndex = createRoute({
  getParentRoute: () => appLayout,
  path: "/tasks",
  beforeLoad: () => {
    throw redirect({ to: "/tasks/$view", params: { view: "today" } });
  },
});
const calendarRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/calendar",
  component: CalendarPage,
  validateSearch: (s: Record<string, unknown>): { date?: string } => ({
    date: typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : undefined,
  }),
});
const docRoute = createRoute({ getParentRoute: () => appLayout, path: "/doc/$noteId", component: DocPage });
const settingsRoute = createRoute({
  getParentRoute: () => appLayout,
  path: "/settings/$section",
  component: SettingsPage,
  params: {
    parse: (p) => ({
      section: (["account", "notebooks", "agents", "appearance"].includes(p.section) ? p.section : "account") as SettingsSection,
    }),
    stringify: (p) => ({ section: p.section }),
  },
});
const settingsIndex = createRoute({
  getParentRoute: () => appLayout,
  path: "/settings",
  beforeLoad: () => {
    throw redirect({ to: "/settings/$section", params: { section: "account" } });
  },
});

const guestRoute = createRoute({ getParentRoute: () => rootRoute, path: "/s/$shareId", component: GuestPage });

const routeTree = rootRoute.addChildren([
  authLayout.addChildren([loginRoute, signupRoute, recoverRoute]),
  appLayout.addChildren([
    indexRoute,
    allRoute,
    notebookRoute,
    folderRoute,
    tagRoute,
    starredRoute,
    trashRoute,
    tasksIndex,
    tasksRoute,
    calendarRoute,
    docRoute,
    settingsIndex,
    settingsRoute,
  ]),
  guestRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: false, scrollRestoration: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
