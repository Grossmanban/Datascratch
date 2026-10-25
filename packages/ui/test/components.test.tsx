import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Folder, Trash2 } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Avatar,
  Badge,
  Button,
  Calendar,
  Checkbox,
  CommandItem,
  CommandPalette,
  DateChip,
  DatePicker,
  Dialog,
  DialogContent,
  DocCard,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Input,
  SegmentedControl,
  SidebarItem,
  SidebarSection,
  Switch,
  Tab,
  TabPanel,
  Tabs,
  TabsList,
  TagChip,
  TaskCheckbox,
  useToast,
  type TaskState,
} from "../src";
import { renderUI } from "./render";

const now = new Date(2026, 9, 25, 12);

describe("Button", () => {
  it("is a button that fires and blocks while loading", async () => {
    const onClick = vi.fn();
    const { rerender } = renderUI(<Button onClick={onClick}>Создать</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Создать" }));
    expect(onClick).toHaveBeenCalledOnce();
    rerender(
      <Button onClick={onClick} loading>
        Создать
      </Button>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });
  it("renders as a link with asChild", () => {
    renderUI(
      <Button asChild variant="primary">
        <a href="/x">Открыть</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Открыть" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });
});

describe("IconButton", () => {
  it("has an accessible name", () => {
    renderUI(<IconButton label="Удалить" icon={<Trash2 />} />);
    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();
  });
});

describe("Input", () => {
  it("marks invalid state", () => {
    renderUI(<Input placeholder="Название" invalid />);
    expect(screen.getByPlaceholderText("Название")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("Checkbox & Switch", () => {
  it("toggles a labelled checkbox", async () => {
    const on = vi.fn();
    renderUI(<Checkbox label="Показывать выполненные" onCheckedChange={on} />);
    await userEvent.click(screen.getByLabelText("Показывать выполненные"));
    expect(on).toHaveBeenCalledWith(true);
  });
  it("toggles a switch by keyboard", async () => {
    const on = vi.fn();
    renderUI(<Switch label="Тёмная тема" onCheckedChange={on} />);
    screen.getByRole("switch", { name: "Тёмная тема" }).focus();
    await userEvent.keyboard(" ");
    expect(on).toHaveBeenCalledWith(true);
  });
});

describe("TaskCheckbox", () => {
  function Task() {
    const [s, setS] = useState<TaskState>("open");
    return <TaskCheckbox state={s} onStateChange={setS} aria-label="Купить бумагу" />;
  }
  it("completes and reopens a task", async () => {
    renderUI(<Task />);
    const box = screen.getByRole("checkbox", { name: "Купить бумагу" });
    expect(box).toHaveAttribute("aria-checked", "false");
    await userEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(box).toHaveAttribute("data-task-state", "done");
    await userEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
  });
  it("describes cancelled tasks", () => {
    renderUI(<TaskCheckbox state="cancelled" aria-label="Старое" />);
    expect(screen.getByRole("checkbox", { name: "Старое" })).toHaveAttribute(
      "aria-description",
      "Отменено",
    );
  });
});

describe("SegmentedControl", () => {
  it("selects with the keyboard and never deselects", async () => {
    const on = vi.fn();
    renderUI(
      <SegmentedControl
        aria-label="Вид"
        value="list"
        onValueChange={on}
        options={[
          { value: "list", label: "Список" },
          { value: "cards", label: "Карточки" },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Список" }));
    expect(on).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("radio", { name: "Карточки" }));
    expect(on).toHaveBeenCalledWith("cards");
  });
});

describe("Tabs", () => {
  it("switches panels", async () => {
    function T() {
      const [v, setV] = useState("a");
      return (
        <Tabs value={v} onValueChange={setV}>
          <TabsList>
            <Tab value="a">Документы</Tab>
            <Tab value="b" count={3}>
              Задачи
            </Tab>
          </TabsList>
          <TabPanel value="a">A</TabPanel>
          <TabPanel value="b">B</TabPanel>
        </Tabs>
      );
    }
    renderUI(<T />);
    await userEvent.click(screen.getByRole("tab", { name: /Задачи/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("B");
  });
});

describe("DropdownMenu", () => {
  it("opens and runs an item", async () => {
    const on = vi.fn();
    renderUI(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Ещё</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem icon={<Trash2 />} danger onSelect={on} shortcut="mod+backspace">
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Ещё" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Удалить/ }));
    expect(on).toHaveBeenCalledOnce();
  });
});

describe("Dialog", () => {
  it("is labelled by its title and closes", async () => {
    function D() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent title="Новый блокнот" description="Выберите режим">
            body
          </DialogContent>
        </Dialog>
      );
    }
    renderUI(<D />);
    const dialog = screen.getByRole("dialog", { name: "Новый блокнот" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Закрыть" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("CommandPalette", () => {
  it("filters and selects", async () => {
    const on = vi.fn();
    renderUI(
      <CommandPalette open onOpenChange={() => {}}>
        <CommandItem onSelect={on}>Новый документ</CommandItem>
        <CommandItem onSelect={() => {}}>Открыть календарь</CommandItem>
      </CommandPalette>,
    );
    await userEvent.type(screen.getByRole("combobox"), "календ");
    expect(screen.queryByText("Новый документ")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole("combobox"));
    await userEvent.type(screen.getByRole("combobox"), "новый{enter}");
    expect(on).toHaveBeenCalledOnce();
  });
});

describe("Toast", () => {
  it("shows a toast with an undo action", async () => {
    const undo = vi.fn();
    function T() {
      const { toast } = useToast();
      return (
        <Button
          onClick={() =>
            toast({ title: "Документ удалён", action: { label: "Отменить", onClick: undo } })
          }
        >
          Удалить
        </Button>
      );
    }
    renderUI(<T />);
    await userEvent.click(screen.getByRole("button", { name: "Удалить" }));
    expect(await screen.findByText("Документ удалён")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Отменить" }));
    expect(undo).toHaveBeenCalledOnce();
  });
});

describe("Chips", () => {
  it("DateChip shows overdue in red tone", () => {
    renderUI(<DateChip date={new Date(2026, 9, 20)} now={now} />);
    expect(screen.getByText("20 окт").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "overdue",
    );
  });
  it("DateChip respects locale", () => {
    renderUI(<DateChip date={new Date(2026, 9, 26)} now={now} kind="deadline" />, { locale: "en" });
    expect(screen.getByText("Tomorrow").closest("[data-tone]")).toHaveAttribute(
      "data-tone",
      "soon",
    );
  });
  it("TagChip can be removed", async () => {
    const on = vi.fn();
    renderUI(<TagChip name="работа" tint="blue" onRemove={on} />);
    await userEvent.click(screen.getByRole("button", { name: "Убрать #работа" }));
    expect(on).toHaveBeenCalledOnce();
  });
  it("Badge renders", () => {
    renderUI(<Badge tone="accent">3</Badge>);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("Calendar & DatePicker", () => {
  it("moves focus with arrows and picks with Enter", async () => {
    const on = vi.fn();
    renderUI(<Calendar value={new Date(2026, 9, 25)} onChange={on} now={now} />);
    const selected = screen.getByRole("button", { name: /25 октября 2026/ });
    selected.focus();
    await userEvent.keyboard("{ArrowRight}{Enter}");
    expect(on).toHaveBeenCalledOnce();
    expect(on.mock.calls[0]![0].getDate()).toBe(26);
  });
  it("starts weeks on Monday in Russian", () => {
    renderUI(<Calendar value={null} onChange={() => {}} now={now} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent(/пн/i);
  });
  it("offers quick picks", async () => {
    const on = vi.fn();
    renderUI(
      <DatePicker value={null} onChange={on} now={now}>
        <Button>Дата</Button>
      </DatePicker>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Дата" }));
    await userEvent.click(await screen.findByRole("button", { name: "Завтра" }));
    expect(on.mock.calls[0]![0].getDate()).toBe(26);
  });
});

describe("Sidebar", () => {
  it("expands nested folders by keyboard and marks the current item", async () => {
    renderUI(
      <ul>
        <SidebarItem label="Работа" icon={<Folder />} tint="blue" count={4}>
          <SidebarItem label="Клиенты" depth={1} selected />
        </SidebarItem>
      </ul>,
    );
    const work = screen.getByRole("button", { name: /Работа/ });
    expect(work).toHaveAttribute("aria-expanded", "false");
    work.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(work).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("button", { name: "Клиенты" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
  it("collapses a section", async () => {
    renderUI(
      <SidebarSection title="Папки">
        <SidebarItem label="Личное" />
      </SidebarSection>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Папки" }));
    await waitFor(() => expect(screen.queryByText("Личное")).not.toBeInTheDocument());
  });
});

describe("Cards & misc", () => {
  it("DocCard shows a serif title and links", () => {
    renderUI(<DocCard title="Дневник" subtitle="Заметки" href="/doc/1" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/doc/1");
    expect(screen.getByRole("heading", { name: "Дневник" })).toHaveClass("font-display");
  });
  it("EmptyState and Avatar", async () => {
    renderUI(
      <>
        <EmptyState icon={<Folder />} title="Пусто" description="Создайте первый документ" />
        <Avatar name="Анна Петрова" presence="online" />
      </>,
    );
    expect(screen.getByRole("heading", { name: "Пусто" })).toBeInTheDocument();
    expect(await screen.findByText("АП")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "в сети" })).toBeInTheDocument();
  });
});

describe("Editor & lists v2", () => {
  it("TaskRow toggles and shows source", async () => {
    const { TaskRow } = await import("../src");
    function T() {
      const [s, setS] = useState<TaskState>("open");
      return (
        <TaskRow
          title="Сдать курсовую"
          state={s}
          onStateChange={setS}
          deadline={new Date(2026, 9, 26)}
          now={now}
          source="Учёба"
          tags={[{ name: "срочно", tint: "red" }]}
        />
      );
    }
    renderUI(<T />);
    expect(screen.getByText("из «Учёба»")).toBeInTheDocument();
    expect(screen.getByText("Завтра").closest("[data-tone]")).toHaveAttribute("data-tone", "soon");
    await userEvent.click(screen.getByRole("checkbox", { name: "Сдать курсовую" }));
    expect(screen.getByText("Сдать курсовую").closest("[data-task-state]")).toHaveAttribute(
      "data-task-state",
      "done",
    );
    expect(screen.getByText("Завтра").closest("[data-tone]")).toHaveAttribute("data-tone", "done");
  });
  it("DocRow is a button with current state", async () => {
    const { DocRow, DocList } = await import("../src");
    const on = vi.fn();
    renderUI(
      <DocList>
        <li>
          <DocRow title="План квартала" excerpt="Цели" detail="12 окт" selected onClick={on} />
        </li>
      </DocList>,
    );
    const row = screen.getByRole("button", { name: /План квартала/ });
    expect(row).toHaveAttribute("aria-current", "page");
    await userEvent.click(row);
    expect(on).toHaveBeenCalledOnce();
  });
  it("PenToolbar switches tool, colour, width, eraser mode and undo", async () => {
    const { PenToolbar, defaultPenSelection } = await import("../src");
    const on = vi.fn();
    const undo = vi.fn();
    const { rerender } = renderUI(
      <PenToolbar
        value={defaultPenSelection}
        onChange={on}
        canUndo
        onUndo={undo}
        onRedo={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "Синий" }));
    expect(on).toHaveBeenLastCalledWith({ ...defaultPenSelection, color: "blue" });
    await userEvent.click(screen.getByRole("button", { name: "Текстовыделитель" }));
    expect(on).toHaveBeenLastCalledWith({
      ...defaultPenSelection,
      tool: "highlighter",
      color: "yellow",
    });
    rerender(
      <PenToolbar
        value={{ ...defaultPenSelection, tool: "highlighter", color: "yellow" }}
        onChange={on}
      />,
    );
    expect(screen.getByRole("radio", { name: "Жёлтый" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("radio", { name: "Коричневый" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ручка" }));
    expect(on).toHaveBeenLastCalledWith({ ...defaultPenSelection, tool: "pen", color: "black" });
    await userEvent.click(screen.getByRole("radio", { name: "Толстая" }));
    expect(on).toHaveBeenLastCalledWith({
      ...defaultPenSelection,
      tool: "highlighter",
      color: "yellow",
      width: 3,
    });
    rerender(<PenToolbar value={{ ...defaultPenSelection, tool: "eraser" }} onChange={on} />);
    expect(screen.getByText("штрих")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ластик/ }));
    expect(on).toHaveBeenLastCalledWith({
      ...defaultPenSelection,
      tool: "eraser",
      eraserMode: "pixel",
    });
    expect(screen.queryByRole("radiogroup", { name: "Цвет" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Текст \(/ }));
    expect(on).toHaveBeenLastCalledWith({ ...defaultPenSelection, tool: null });
    await userEvent.click(screen.getByRole("button", { name: "Рисовать мышью и пальцем" }));
    expect(on).toHaveBeenLastCalledWith({
      ...defaultPenSelection,
      tool: "eraser",
      drawWithAnyPointer: true,
    });
    rerender(
      <PenToolbar
        value={defaultPenSelection}
        onChange={on}
        canUndo
        onUndo={undo}
        onRedo={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Отменить" }));
    expect(undo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();
  });
  it("SuggestionMenu marks the selected option and picks on click", async () => {
    const { SuggestionMenu } = await import("../src");
    const pick = vi.fn();
    renderUI(
      <SuggestionMenu
        anchorRect={{ top: 100, left: 100, width: 1, height: 20 }}
        selectedIndex={1}
        onPick={pick}
        groups={[
          {
            heading: "Текст",
            items: [
              { id: "h1", label: "Заголовок 1", hint: "#" },
              { id: "task", label: "Задача", hint: "[]" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole("option", { name: /Задача/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /Задача/ })).toHaveAttribute("id", "ds-suggest-task");
    await userEvent.click(screen.getByRole("option", { name: /Заголовок 1/ }));
    expect(pick).toHaveBeenCalledWith(expect.objectContaining({ id: "h1" }));
  });
  it("FormatToolbar floats with a panel", async () => {
    const { FormatToolbar, LinkPanel } = await import("../src");
    const apply = vi.fn();
    renderUI(
      <FormatToolbar
        aria-label="Формат"
        anchorRect={{ top: 300, left: 200, width: 80, height: 20 }}
        items={[{ id: "link", label: "Ссылка", icon: <Folder />, active: true, onClick: () => {} }]}
        panel={<LinkPanel href="" onApply={apply} />}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Вставьте ссылку"), "https://ex.am{enter}");
    expect(apply).toHaveBeenCalledWith("https://ex.am");
  });
  it("FormatToolbar reflects active marks and runs actions", async () => {
    const { FormatToolbar } = await import("../src");
    const bold = vi.fn();
    renderUI(
      <FormatToolbar
        aria-label="Формат"
        items={[
          { id: "bold", label: "Жирный", icon: <Folder />, active: true, onClick: bold },
          "separator",
          { id: "italic", label: "Курсив", icon: <Folder />, onClick: () => {} },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Жирный" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Курсив" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "Жирный" }));
    expect(bold).toHaveBeenCalledOnce();
  });
});
