import SwiftUI

/// Every DSDesign component on one screen. Used by previews, the snapshot test
/// (CI renders it to PNG for design review) and as a debug screen in the app.
public struct DSShowcase: View {
    @State private var tasks: [DSTaskState] = [.open, .done, .open, .cancelled]
    @State private var segment = "cards"
    @State private var workOpen = true
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
        VStack(alignment: .leading, spacing: DSSpace.s6) {
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
            .frame(height: 210)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: DSSpace.s2) {
                    Text("Сегодня").dsFont(.h2).foregroundStyle(Color.dsPrimary)
                    DSBadge(count: 3, style: .accent)
                }
                .padding(.bottom, DSSpace.s2)
                taskRow(0, "Отправить черновик договора", date: day(-2), deadline: false)
                taskRow(1, "Позвонить в типографию", date: now, deadline: false)
                taskRow(2, "Сдать курсовую", date: day(1), deadline: true)
                taskRow(3, "Старая идея", date: day(5), deadline: false)
            }
            .frame(maxWidth: 560)

            HStack(spacing: DSSpace.s3) {
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
                    DSGlassPanel(cornerRadius: DSRadius.full, padding: DSSpace.s2) {
                        HStack(spacing: DSSpace.s4) {
                            ForEach(["pencil.tip", "highlighter", "bold", "italic", "underline"], id: \.self) { name in
                                Image(systemName: name).font(.system(size: 17, weight: .medium)).foregroundStyle(Color.dsPrimary)
                            }
                        }
                        .padding(.horizontal, DSSpace.s2)
                    }
                }
                .frame(width: 320, height: 150)
                .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg, style: .continuous))

                DSCard {
                    DSEmptyState(systemImage: "tray", title: "Здесь пока пусто", message: "Создайте первый документ", tint: .blue)
                }
                .frame(width: 300)

                VStack(alignment: .leading, spacing: DSSpace.s3) {
                    DSSkeletonLines(lines: 3)
                    HStack {
                        DSAvatar(name: "Анна Петрова", presence: .online)
                        DSAvatar(name: "Иван Смирнов", presence: .away)
                        DSSpinner()
                    }
                }
                .frame(width: 180)
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

    private func taskRow(_ index: Int, _ title: String, date: Date, deadline: Bool) -> some View {
        HStack(spacing: DSSpace.s3) {
            DSTaskCheckbox(state: $tasks[index], label: title)
            Text(title)
                .dsFont(.body)
                .foregroundStyle(tasks[index] == .open ? Color.dsPrimary : Color.dsTertiary)
                .strikethrough(tasks[index] != .open, color: .dsTertiary)
            Spacer()
            DSDateChip(date: date, now: now, isDeadline: deadline, isCompleted: tasks[index] != .open)
        }
        .padding(.vertical, DSSpace.s2)
        .overlay(alignment: .bottom) { Rectangle().fill(Color.dsSeparator).frame(height: 0.5) }
    }
}

#Preview("Showcase — light", traits: .landscapeLeft) {
    DSShowcase()
}

#Preview("Showcase — dark", traits: .landscapeLeft) {
    DSShowcase().preferredColorScheme(.dark)
}
