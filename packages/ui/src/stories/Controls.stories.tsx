import type { Story } from "@ladle/react";
import { ArrowUpRight, Mail, Plus, Search, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Checkbox,
  DateChip,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  SegmentedControl,
  Skeleton,
  Spinner,
  Switch,
  Tab,
  TabPanel,
  Tabs,
  TabsList,
  TagChip,
  TaskCheckbox,
  TextArea,
  Tooltip,
  type TaskState,
} from "..";

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h3 className="mb-3 text-footnote font-semibold text-fg-tertiary">{title}</h3>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </section>
);

export const Buttons: Story = () => (
  <>
    <Row title="Варианты">
      <Button variant="primary" leading={<Plus />}>
        Новый документ
      </Button>
      <Button variant="ink">Продолжить</Button>
      <Button>Отмена</Button>
      <Button variant="ghost" trailing={<ArrowUpRight />}>
        Открыть
      </Button>
      <Button variant="danger" leading={<Trash2 />}>
        Удалить
      </Button>
    </Row>
    <Row title="Размеры и состояния">
      <Button size="sm">Маленькая</Button>
      <Button size="md">Средняя</Button>
      <Button size="lg" variant="primary">
        Большая
      </Button>
      <Button loading variant="primary">
        Сохранение
      </Button>
      <Button disabled>Недоступна</Button>
    </Row>
    <Row title="Иконки">
      <IconButton label="Поиск" shortcut="mod+k" icon={<Search />} />
      <IconButton label="Настройки" variant="secondary" icon={<Settings />} />
      <IconButton label="Создать" variant="glass" shape="round" size="lg" icon={<Plus />} />
      <Tooltip content="Палитра команд" shortcut="mod+k">
        <span className="text-callout text-fg-secondary underline decoration-dotted">наведи</span>
      </Tooltip>
      <Kbd shortcut="mod+shift+k" />
    </Row>
  </>
);

export const Fields: Story = () => {
  const [text, setText] = useState("");
  return (
    <div className="flex max-w-[420px] flex-col gap-4">
      <Input placeholder="Название документа" />
      <Input placeholder="Поиск" leading={<Search />} trailing={<Kbd shortcut="mod+k" />} />
      <Input placeholder="Почта" leading={<Mail />} size="lg" type="email" />
      <Input placeholder="Ошибка" invalid defaultValue="не почта" />
      <TextArea placeholder="Описание растёт вместе с текстом…" value={text} onChange={(e) => setText(e.target.value)} />
      <Input bare placeholder="Без рамки — для заголовков" className="font-display text-h1" />
    </div>
  );
};

export const Toggles: Story = () => {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [tasks, setTasks] = useState<TaskState[]>(["open", "done", "cancelled"]);
  return (
    <>
      <Row title="Чек-бокс задачи (круглый, анимированный)">
        {tasks.map((s, i) => (
          <TaskCheckbox key={i} state={s} aria-label={`Задача ${i + 1}`} onStateChange={(n) => setTasks((xs) => xs.map((x, j) => (j === i ? n : x)))} />
        ))}
        <TaskCheckbox state="open" size={24} aria-label="Крупная" />
      </Row>
      <Row title="Чек-бокс и переключатель">
        <Checkbox label="Показывать выполненные" defaultChecked />
        <Checkbox checked="indeterminate" aria-label="Частично" />
        <div className="w-[320px]">
          <Switch label="Синхронизация" description="Через ваш сервер, сквозное шифрование" defaultChecked />
        </div>
        <Switch size="sm" aria-label="Маленький" />
      </Row>
      <Row title="Сегменты">
        <SegmentedControl
          aria-label="Масштаб календаря"
          value={view}
          onValueChange={setView}
          options={[
            { value: "day", label: "День" },
            { value: "week", label: "Неделя" },
            { value: "month", label: "Месяц" },
          ]}
        />
      </Row>
    </>
  );
};

export const TabsStory: Story = () => {
  const [v, setV] = useState("docs");
  return (
    <Tabs value={v} onValueChange={setV} className="max-w-doc-normal">
      <TabsList>
        <Tab value="docs">Документы</Tab>
        <Tab value="tasks" count={7}>
          Задачи
        </Tab>
        <Tab value="files">Файлы</Tab>
      </TabsList>
      <TabPanel value="docs">Все документы пространства.</TabPanel>
      <TabPanel value="tasks">Задачи из всех документов.</TabPanel>
      <TabPanel value="files">Вложения.</TabPanel>
    </Tabs>
  );
};
TabsStory.storyName = "Tabs";

export const Chips: Story = () => {
  const now = new Date();
  const day = (n: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  return (
    <>
      <Row title="Даты">
        <DateChip date={day(-3)} />
        <DateChip date={day(0)} />
        <DateChip date={day(1)} />
        <DateChip date={day(1)} kind="deadline" />
        <DateChip date={day(4)} />
        <DateChip date={day(40)} />
        <DateChip date={day(-1)} completed />
      </Row>
      <Row title="Теги и бейджи">
        <TagChip name="работа" tint="blue" />
        <TagChip name="идеи" tint="purple" onRemove={() => {}} />
        <TagChip name="учёба/матан" tint="green" size="sm" />
        <Badge>12</Badge>
        <Badge tone="accent">Новое</Badge>
        <Badge tone="success">Синхронизировано</Badge>
        <Badge tint="orange">Для агентов</Badge>
      </Row>
      <Row title="Люди">
        <Avatar name="Анна Петрова" presence="online" size={36} />
        <Avatar name="Иван Смирнов" presence="away" size={36} />
        <Avatar name="Claude" presence="offline" size={36} />
        <AvatarStack people={["Анна", "Иван", "Мария", "Олег", "Пётр", "Ли"].map((name) => ({ name }))} />
      </Row>
    </>
  );
};

export const Loading: Story = () => (
  <div className="flex max-w-[420px] flex-col gap-6">
    <div className="flex items-center gap-3 text-fg-secondary">
      <Spinner /> <Spinner size={24} />
    </div>
    <div className="flex items-center gap-3">
      <Skeleton shape="circle" className="size-10" />
      <Skeleton shape="line" lines={2} className="flex-1" />
    </div>
    <Skeleton className="h-32" />
  </div>
);

export const Empty: Story = () => (
  <EmptyState
    icon={<Plus />}
    tint="blue"
    title="Здесь пока пусто"
    description="Создайте первый документ или перетащите сюда файл."
    action={
      <Button variant="primary" leading={<Plus />}>
        Новый документ
      </Button>
    }
  />
);
