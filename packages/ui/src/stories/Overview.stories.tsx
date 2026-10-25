import type { Story } from "@ladle/react";
import {
  Bold,
  CalendarDays,
  CheckSquare,
  Copy,
  FileText,
  Folder,
  Hash,
  Highlighter,
  Inbox,
  Italic,
  LayoutGrid,
  List,
  PanelsTopLeft,
  PenLine,
  Search,
  Share2,
  Star,
  Trash2,
  Underline,
} from "lucide-react";
import { useState } from "react";
import leaves from "./assets/cover-leaves.jpg";
import mountains from "./assets/cover-mountains.jpg";
import sea from "./assets/cover-sea.jpg";
import {
  AvatarStack,
  Badge,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DateChip,
  DocCard,
  GlassPanel,
  IconButton,
  SegmentedControl,
  Sidebar,
  SidebarItem,
  SidebarSection,
  TagChip,
  TaskCheckbox,
  useToast,
  type TaskState,
} from "..";

const docs: { title: string; subtitle: string; cover?: string; icon?: string }[] = [
  {
    title: "Дневник поездки в Тбилиси",
    subtitle: "Старый город, серные бани и хачапури на рассвете",
    cover: mountains,
  },
  {
    title: "Конспект: теория графов",
    subtitle: "Лекции 4–6 · эйлеровы циклы",
    icon: "📐",
  },
  { title: "План квартала", subtitle: "Цели, метрики, ритм встреч", cover: leaves },
  { title: "Идеи для рассказа", subtitle: "Персонажи и черновые сцены", icon: "✍️" },
  { title: "Рецепты", subtitle: "То, что получилось с первого раза", cover: sea },
];

function Tasks() {
  const now = new Date();
  const [tasks, setTasks] = useState<
    { title: string; state: TaskState; date: Date; deadline?: boolean }[]
  >([
    {
      title: "Отправить черновик договора",
      state: "open",
      date: new Date(now.getTime() - 86400000 * 2),
    },
    { title: "Купить хорошую бумагу A5", state: "open", date: now },
    { title: "Позвонить в типографию", state: "done", date: now },
    {
      title: "Сдать курсовую",
      state: "open",
      date: new Date(now.getTime() + 86400000),
      deadline: true,
    },
  ]);
  return (
    <ul className="flex flex-col">
      {tasks.map((t, i) => (
        <li
          key={t.title}
          className="flex items-center gap-3 border-b border-hairline py-2.5 last:border-none"
        >
          <TaskCheckbox
            aria-label={t.title}
            state={t.state}
            onStateChange={(s) =>
              setTasks((xs) => xs.map((x, j) => (j === i ? { ...x, state: s } : x)))
            }
          />
          <span
            className={
              t.state === "done"
                ? "flex-1 text-fg-tertiary line-through decoration-fg-tertiary/50"
                : "flex-1"
            }
          >
            {t.title}
          </span>
          <DateChip
            date={t.date}
            kind={t.deadline ? "deadline" : "scheduled"}
            completed={t.state !== "open"}
          />
        </li>
      ))}
    </ul>
  );
}

export const Showcase: Story = () => {
  const [view, setView] = useState<"cards" | "list">("cards");
  const [selected, setSelected] = useState("all");
  const { toast } = useToast();
  return (
    <div className="fixed inset-0 z-0 flex overflow-hidden bg-canvas">
      <Sidebar>
        <div className="flex items-center gap-2 px-2 pb-1">
          <span className="grid size-6 place-items-center rounded-md bg-fg font-display text-callout text-canvas">
            D
          </span>
          <span className="flex-1 font-medium">Личное</span>
          <IconButton size="sm" label="Поиск" shortcut="mod+k" icon={<Search />} />
        </div>
        <SidebarSection title="Вкладки">
          <SidebarItem label="Дневник поездки" icon={<FileText />} />
          <SidebarItem label="План квартала" icon={<FileText />} />
        </SidebarSection>
        <SidebarSection collapsible={false}>
          <SidebarItem
            label="Все документы"
            icon={<PanelsTopLeft />}
            count={128}
            selected={selected === "all"}
            onClick={() => setSelected("all")}
          />
          <SidebarItem
            label="Входящие"
            icon={<Inbox />}
            count={3}
            selected={selected === "inbox"}
            onClick={() => setSelected("inbox")}
          />
          <SidebarItem
            label="Задачи"
            icon={<CheckSquare />}
            count={7}
            selected={selected === "tasks"}
            onClick={() => setSelected("tasks")}
          />
          <SidebarItem
            label="Календарь"
            icon={<CalendarDays />}
            selected={selected === "cal"}
            onClick={() => setSelected("cal")}
          />
        </SidebarSection>
        <SidebarSection title="Избранное">
          <SidebarItem label="Идеи для рассказа" icon={<Star />} tint="yellow" />
        </SidebarSection>
        <SidebarSection
          title="Папки"
          action={{
            label: "Новая папка",
            onClick: () => toast({ title: "Папка создана", tone: "success" }),
          }}
        >
          <SidebarItem label="Работа" icon={<Folder />} tint="blue" count={24} defaultExpanded>
            <SidebarItem label="Клиенты" icon={<Folder />} tint="blue" depth={1} count={9} />
            <SidebarItem label="Отчёты" icon={<Folder />} tint="blue" depth={1} />
          </SidebarItem>
          <SidebarItem label="Учёба" icon={<Folder />} tint="green" count={41} />
          <SidebarItem label="Путешествия" icon={<Folder />} tint="orange" count={12} />
        </SidebarSection>
        <SidebarSection title="Теги">
          <SidebarItem label="идеи" icon={<Hash />} tint="purple" />
          <SidebarItem label="срочно" icon={<Hash />} tint="red" />
        </SidebarSection>
      </Sidebar>

      <main className="relative flex-1 overflow-y-auto">
        <div className="relative mx-auto max-w-doc-wide px-10 pt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-title">Все документы</h1>
              <p className="mt-1 text-callout text-fg-secondary">
                128 документов · обновлено сегодня
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AvatarStack
                people={[{ name: "Анна Петрова" }, { name: "Иван Смирнов" }, { name: "Claude" }]}
              />
              <SegmentedControl
                aria-label="Вид"
                value={view}
                onValueChange={setView}
                options={[
                  { value: "cards", label: "Карточки", icon: <LayoutGrid /> },
                  { value: "list", label: "Список", icon: <List /> },
                ]}
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
            {docs.map((d) => (
              <ContextMenu key={d.title}>
                <ContextMenuTrigger asChild>
                  <DocCard
                    tabIndex={0}
                    title={d.title}
                    subtitle={d.subtitle}
                    cover={d.cover ?? null}
                    {...(d.icon ? { icon: d.icon } : {})}
                    meta={<span>2 ч назад</span>}
                    footer={<TagChip name="идеи" tint="purple" size="sm" />}
                  />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem icon={<Star />}>В избранное</ContextMenuItem>
                  <ContextMenuItem icon={<Copy />} shortcut="mod+d">
                    Дублировать
                  </ContextMenuItem>
                  <ContextMenuItem icon={<Share2 />}>Поделиться…</ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    icon={<Trash2 />}
                    danger
                    onSelect={() =>
                      toast({
                        title: "Документ удалён",
                        action: { label: "Отменить", onClick: () => {} },
                      })
                    }
                  >
                    Удалить
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>

          <section className="mt-12 max-w-doc-normal pb-32">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-display text-h2">Сегодня</h2>
              <Badge tone="accent">3</Badge>
            </div>
            <Tasks />
          </section>
        </div>

        <GlassPanel
          shape="pill"
          className="fixed bottom-6 left-[calc(50%+132px)] z-10 flex -translate-x-1/2 items-center gap-0.5"
        >
          <IconButton size="md" shape="round" label="Перо" icon={<PenLine />} active />
          <IconButton size="md" shape="round" label="Маркер" icon={<Highlighter />} />
          <span className="mx-1 h-5 w-px bg-separator" />
          <IconButton size="md" shape="round" label="Жирный" shortcut="mod+b" icon={<Bold />} />
          <IconButton size="md" shape="round" label="Курсив" shortcut="mod+i" icon={<Italic />} />
          <IconButton
            size="md"
            shape="round"
            label="Подчеркнуть"
            shortcut="mod+u"
            icon={<Underline />}
          />
        </GlassPanel>
      </main>
    </div>
  );
};
