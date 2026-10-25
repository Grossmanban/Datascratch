import type { Story } from "@ladle/react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  FilePlus2,
  FolderInput,
  MoreHorizontal,
  Moon,
  PenLine,
  Settings,
  Share2,
  Star,
  Sun,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  Button,
  Calendar,
  CommandGroup,
  CommandItem,
  CommandPalette,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  DateChip,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
  Switch,
  useCommandPaletteShortcut,
  useToast,
} from "..";

export const Menus: Story = () => {
  const [done, setDone] = useState(true);
  return (
    <div className="flex items-start gap-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="Ещё" variant="secondary" icon={<MoreHorizontal />} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Документ</DropdownMenuLabel>
          <DropdownMenuItem icon={<Star />}>В избранное</DropdownMenuItem>
          <DropdownMenuItem icon={<Copy />} shortcut="mod+d">
            Дублировать
          </DropdownMenuItem>
          <DropdownMenuItem icon={<Share2 />}>Поделиться…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={done} onCheckedChange={setDone}>
            Показывать выполненные
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={<Trash2 />} danger shortcut="mod+backspace">
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContextMenu>
        <ContextMenuTrigger className="grid h-40 w-80 place-items-center rounded-xl border border-dashed border-hairline text-callout text-fg-tertiary">
          Правый клик по задаче
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Перенести</ContextMenuLabel>
          <ContextMenuItem icon={<Sun />}>Сегодня</ContextMenuItem>
          <ContextMenuItem icon={<Moon />}>Завтра</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger icon={<CalendarDays />}>Дата…</ContextMenuSubTrigger>
            <ContextMenuSubContent className="p-2">
              <Calendar value={null} onChange={() => {}} />
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem icon={<CheckCircle2 />}>Выполнить</ContextMenuItem>
          <ContextMenuItem icon={<XCircle />}>Отменить</ContextMenuItem>
          <ContextMenuItem icon={<FolderInput />}>Переместить…</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem icon={<Trash2 />} danger>
            Удалить
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export const Dialogs: Story = () => (
  <div className="flex gap-3">
    <Dialog>
      <DialogTrigger asChild>
        <Button>Новый блокнот</Button>
      </DialogTrigger>
      <DialogContent
        title="Новый блокнот"
        description="Режим шифрования выбирается один раз."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Отмена</Button>
            </DialogClose>
            <Button variant="primary">Создать</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input placeholder="Название" autoFocus />
          <Switch label="Доступ для агентов" description="Сервер сможет читать содержимое" />
        </div>
      </DialogContent>
    </Dialog>
    <Sheet>
      <SheetTrigger asChild>
        <Button>Инспектор</Button>
      </SheetTrigger>
      <SheetContent title="Стиль документа" description="Шрифт, ширина, бумага">
        <p className="text-callout text-fg-secondary">Содержимое панели.</p>
      </SheetContent>
    </Sheet>
    <Sheet>
      <SheetTrigger asChild>
        <Button>Нижний лист</Button>
      </SheetTrigger>
      <SheetContent side="bottom" title="Поделиться">
        <p className="text-callout text-fg-secondary">Для узких экранов.</p>
      </SheetContent>
    </Sheet>
  </div>
);

export const Pickers: Story = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  return (
    <div className="flex items-start gap-10">
      <DatePicker value={date} onChange={setDate}>
        <Button leading={<CalendarDays />}>{date ? date.toLocaleDateString("ru-RU") : "Без даты"}</Button>
      </DatePicker>
      {date && <DateChip date={date} />}
      <Popover>
        <PopoverTrigger asChild>
          <Button>Поповер</Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <p className="font-display text-h3">Стеклянная панель</p>
          <p className="mt-1 text-footnote text-fg-secondary">Размытие, тонкая рамка, мягкая тень.</p>
        </PopoverContent>
      </Popover>
      <div className="rounded-xl border border-hairline bg-surface p-3 shadow-card">
        <Calendar value={date} onChange={setDate} marked={(d) => d.getDate() % 5 === 0} />
      </div>
    </div>
  );
};

export const Palette: Story = () => {
  const [open, setOpen] = useState(true);
  const { toast } = useToast();
  useCommandPaletteShortcut(setOpen);
  const run = (title: string) => () => {
    setOpen(false);
    toast({ title, tone: "success" });
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть ⌘K</Button>
      <CommandPalette open={open} onOpenChange={setOpen}>
        <CommandGroup heading="Действия">
          <CommandItem icon={<FilePlus2 />} shortcut="mod+n" onSelect={run("Документ создан")}>
            Новый документ
          </CommandItem>
          <CommandItem icon={<PenLine />} onSelect={run("Перо")}>
            Включить перо
          </CommandItem>
          <CommandItem icon={<Settings />} shortcut="mod+," onSelect={run("Настройки")}>
            Настройки
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Документы">
          <CommandItem icon={<Star />} hint="Путешествия" onSelect={run("Открыт")}>
            Дневник поездки в Тбилиси
          </CommandItem>
          <CommandItem icon={<Star />} hint="Учёба" onSelect={run("Открыт")}>
            Конспект: теория графов
          </CommandItem>
        </CommandGroup>
      </CommandPalette>
    </>
  );
};

export const Toasts: Story = () => {
  const { toast } = useToast();
  return (
    <div className="flex gap-3">
      <Button onClick={() => toast({ title: "Документ удалён", action: { label: "Отменить", onClick: () => {} } })}>С отменой</Button>
      <Button onClick={() => toast({ title: "Синхронизировано", tone: "success" })}>Успех</Button>
      <Button onClick={() => toast({ title: "Нет связи с сервером", description: "Изменения сохранены на устройстве", tone: "warning" })}>
        Предупреждение
      </Button>
      <Button onClick={() => toast({ title: "Не удалось расшифровать", tone: "danger" })}>Ошибка</Button>
    </div>
  );
};
