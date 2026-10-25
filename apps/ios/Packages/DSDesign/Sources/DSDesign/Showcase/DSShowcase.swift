import SwiftUI

/// Every DSDesign component on one screen. Used by previews, the snapshot test
/// (CI renders it to PNG for design review) and as a debug screen in the app.
public struct DSShowcase: View {
    @State private var tasks: [DSTaskState] = [.open, .done, .open, .cancelled]
    @State private var segment = "cards"
    @State private var workOpen = true
    @State private var pen = DSPenSelection()
    private let now: Date

    public init(now: Date = .now) {
        self.now = now
    }

    public var body: some View {
        HStack(alignment: .top, spacing: 0) {
            sidebar
            Divider().overlay(Color.dsSeparator)
            content
        }
        .background(Color.dsCanvas)
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 1) {
            DSSidebarItem("Все документы", systemImage: "doc.on.doc", count: 128, isSelected: true) {}
            DSSidebarItem("Входящие", systemImage: "tray", count: 3) {}
            DSSidebarItem("Задачи", systemImage: "checkmark.circle", count: 7) {}
            DSSidebarItem("Календарь", systemImage: "calendar") {}
            DSSidebarSection("Избранное") {
                DSSidebarItem("Идеи для рассказа", systemImage: "star.fill", tint: .yellow) {}
            }
            DSSidebarSection("Папки") {
                DSSidebarItem("Работа", systemImage: "folder.fill", tint: .blue, count: 24, isExpanded: $workOpen) {}
                if workOpen {
                    DSSidebarItem("Клиенты", systemImage: "folder.fill", tint: .blue, count: 9, level: 1) {}
                }
                DSSidebarItem("Учёба", systemImage: "folder.fill", tint: .green, count: 41) {}
                DSSidebarItem("Путешествия", systemImage: "folder.fill", tint: .orange, count: 12) {}
            }
            DSSidebarSection("Теги") {
                DSSidebarItem("идеи", systemImage: "number", tint: .purple) {}
            }
            Spacer(minLength: 0)
        }
        .padding(DSSpace.s3)
        .frame(width: 280)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Color.dsSidebar)
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: DSSpace.s5) {
            HStack(alignment: .lastTextBaseline) {
                VStack(alignment: .leading, spacing: DSSpace.s1) {
                    Text("Все документы").dsFont(.title).foregroundStyle(Color.dsPrimary)
                    Text("128 документов · обновлено сегодня").dsFont(.callout).foregroundStyle(Color.dsSecondary)
                }
                Spacer()
                DSAvatarStack(names: ["Анна Петрова", "Иван Смирнов", "Claude"])
                DSSegmentedControl(selection: $segment, segments: [
                    DSSegment("Карточки", value: "cards", systemImage: "square.grid.2x2"),
                    DSSegment("Список", value: "list", systemImage: "list.bullet"),
                ])
                .frame(width: 220)
            }

            HStack(alignment: .top, spacing: DSSpace.s4) {
                DSDocCard(title: "Дневник поездки в Тбилиси", subtitle: "Старый город и серные бани", detail: "2 ч назад", backdrop: .ember)
                DSDocCard(title: "Конспект: теория графов", subtitle: "Лекции 4–6", detail: "Вчера", icon: "📐", backdrop: .mist)
                DSDocCard(title: "План квартала", subtitle: "Цели и метрики", detail: "12 окт", backdrop: .meadow)
            }
            .frame(height: 196)

            HStack(alignment: .top, spacing: DSSpace.s8) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: DSSpace.s2) {
                        Text("Сегодня").dsFont(.h2).foregroundStyle(Color.dsPrimary)
                        DSBadge(count: 3, style: .accent)
                    }
                    .padding(.bottom, DSSpace.s1)
                    taskRow(0, "Отправить черновик договора", scheduled: day(-2), source: "Работа")
                    taskRow(1, "Позвонить в типографию", scheduled: now)
                    taskRow(2, "Сдать курсовую", deadline: day(1), tags: [DSTag("учёба", tint: .green)])
                    taskRow(3, "Старая идея", scheduled: day(5))
                }
                .frame(maxWidth: 540)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Недавние").dsFont(.h2).foregroundStyle(Color.dsPrimary)
                        .padding(.bottom, DSSpace.s1)
                    DSDocRow(title: "Дневник поездки", subtitle: "Старый город, серные бани", detail: "2 ч", icon: .emoji("🏔️"), folderTint: .orange, isSelected: true)
                    DSDocRow(title: "Теория графов", subtitle: "Лекции 4–6", detail: "Вчера", folderTint: .green)
                    DSDocRow(title: "План квартала", detail: "12 окт", icon: .symbol("chart.bar.doc.horizontal"), folderTint: .blue)
                }
                .frame(width: 380)
            }

            HStack(spacing: DSSpace.s3) {
                DSInlineChip(text: "Теория графов")
                DSTagChip("работа", tint: .blue)
                DSTagChip("идеи", tint: .purple)
                DSBadge("Для агентов", style: .tint(.orange))
                DSBadge("Синхронизировано", style: .tint(.green))
                DSDateChip(date: day(40), now: now)
            }

            HStack(spacing: DSSpace.s3) {
                Button("Новый документ") {}.buttonStyle(.ds(.primary))
                Button("Отмена") {}.buttonStyle(.ds(.secondary))
                Button("Открыть") {}.buttonStyle(.ds(.ghost))
                Button("Удалить") {}.buttonStyle(.ds(.destructive))
            }

            HStack(alignment: .top, spacing: DSSpace.s4) {
                ZStack {
                    DSBackdrop(.dusk)
                    VStack(spacing: DSSpace.s3) {
                        DSPenToolbar(selection: $pen, tools: [.pen, .marker, .highlighter], showsTextMode: false)
                            .fixedSize()
                        DSFormatBar(items: [
                            .item(DSFormatBarItem(id: "style", systemImage: "textformat.size", label: "Стиль") {}),
                            .separator(id: "1"),
                            .item(DSFormatBarItem(id: "bold", systemImage: "bold", label: "Жирный", isActive: true) {}),
                            .item(DSFormatBarItem(id: "italic", systemImage: "italic", label: "Курсив") {}),
                            .item(DSFormatBarItem(id: "underline", systemImage: "underline", label: "Подчеркнуть") {}),
                            .separator(id: "2"),
                            .item(DSFormatBarItem(id: "link", systemImage: "link", label: "Ссылка") {}),
                        ])
                    }
                }
                .frame(width: 470, height: 170)
                .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous))

                DSCard {
                    DSEmptyState(systemImage: "tray", title: "Здесь пока пусто", message: "Создайте первый документ", tint: .blue)
                }
                .frame(width: 280)

                VStack(alignment: .leading, spacing: DSSpace.s3) {
                    DSSkeletonLines(lines: 3)
                    HStack {
                        DSAvatar(name: "Анна Петрова", presence: .online)
                        DSAvatar(name: "Иван Смирнов", presence: .away)
                        DSSpinner()
                    }
                }
                .frame(width: 160)
            }
            Spacer(minLength: 0)
        }
        .padding(DSSpace.s10)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(alignment: .top) {
            DSBackdrop(.sand)
                .frame(height: 220)
                .mask(LinearGradient(colors: [.black, .black.opacity(0)], startPoint: .center, endPoint: .bottom))
        }
    }

    private func day(_ offset: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: offset, to: now) ?? now
    }

    private func taskRow(
        _ index: Int,
        _ title: String,
        scheduled: Date? = nil,
        deadline: Date? = nil,
        tags: [DSTag] = [],
        source: String? = nil
    ) -> some View {
        DSTaskRow(state: $tasks[index], title: title, scheduled: scheduled, deadline: deadline, tags: tags, source: source, now: now)
            .overlay(alignment: .bottom) { Rectangle().fill(Color.dsSeparator).frame(height: 0.5) }
    }
}

#Preview("Showcase — light", traits: .landscapeLeft) {
    DSShowcase()
}

#Preview("Showcase — dark", traits: .landscapeLeft) {
    DSShowcase().preferredColorScheme(.dark)
}
