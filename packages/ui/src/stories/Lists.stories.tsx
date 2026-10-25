import type { Story } from "@ladle/react";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { DocCard, DocGrid, DocList, DocRow, IconButton, TaskRow, type TaskState } from "..";

const day = (n: number) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
};

export const Tasks: Story = () => {
  const [states, setStates] = useState<TaskState[]>(["open", "open", "done", "open", "cancelled"]);
  const set = (i: number) => (s: TaskState) => setStates((xs) => xs.map((x, j) => (j === i ? s : x)));
  return (
    <div className="max-w-doc-normal">
      <h2 className="mb-3 font-display text-h1">Сегодня</h2>
      <TaskRow title="Отправить черновик договора" state={states[0]!} onStateChange={set(0)} scheduled={day(-2)} source="Работа" />
      <TaskRow
        title="Купить хорошую бумагу A5"
        note="Clairefontaine или Rhodia, в точку"
        state={states[1]!}
        onStateChange={set(1)}
        scheduled={day(0)}
        tags={[{ name: "покупки", tint: "orange" }]}
      />
      <TaskRow title="Позвонить в типографию" state={states[2]!} onStateChange={set(2)} scheduled={day(0)} />
      <TaskRow title="Сдать курсовую" state={states[3]!} onStateChange={set(3)} deadline={day(1)} source="Учёба" onOpenSource={() => {}} selected />
      <TaskRow title="Старая идея" state={states[4]!} onStateChange={set(4)} scheduled={day(9)} />
    </div>
  );
};

export const Documents: Story = () => (
  <div className="flex flex-col gap-10">
    <DocList className="max-w-doc-normal">
      {[
        { title: "Дневник поездки в Тбилиси", excerpt: "Старый город, серные бани и хачапури на рассвете", icon: "🏔️", tint: "orange" as const, detail: "2 ч назад" },
        { title: "Конспект: теория графов", excerpt: "Лекции 4–6 · эйлеровы циклы", icon: "📐", tint: "green" as const, detail: "Вчера" },
        { title: "План квартала", excerpt: "Цели, метрики, ритм встреч", tint: "blue" as const, detail: "12 окт" },
      ].map((d, i) => (
        <li key={d.title}>
          <DocRow {...d} selected={i === 1} accessory={<IconButton size="sm" label="Ещё" icon={<MoreHorizontal />} />} />
        </li>
      ))}
    </DocList>
    <DocGrid>
      {(["ember", "mist", "meadow", "dusk", "sand"] as const).map((b, i) => (
        <li key={b}>
          <DocCard className="h-full" title={["Путешествия", "Учёба", "Работа", "Идеи", "Рецепты"][i]!} subtitle="Подзаголовок документа" backdrop={b} meta="Сегодня" />
        </li>
      ))}
    </DocGrid>
  </div>
);
