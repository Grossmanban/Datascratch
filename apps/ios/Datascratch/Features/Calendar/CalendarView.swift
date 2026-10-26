import SwiftUI

/// Day strip + the selected day's daily note and tasks (spec/12 §12.2).
struct CalendarView: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    @State private var newTaskText = ""

    private let calendar = Calendar.current

    var body: some View {
        @Bindable var scene = scene
        let today = DayKey.from(Date())
        let day = scene.calendarDay
        let tasks = TaskIndex.tasks(on: day, entries: app.library.taskEntries, today: today)
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.s5) {
                DayStrip(selection: $scene.calendarDay, today: today)

                VStack(alignment: .leading, spacing: Theme.Space.s1) {
                    Text(DayKey.date(day)?.formatted(.dateTime.weekday(.wide)) ?? "")
                        .font(Theme.Typography.footnote.weight(.semibold))
                        .foregroundStyle(day == today ? Theme.Palette.accent : Theme.Palette.textTertiary)
                        .textCase(.uppercase)
                    Text(DayKey.date(day)?.formatted(.dateTime.day().month(.wide).year()) ?? day)
                        .font(Theme.Typography.h1)
                        .foregroundStyle(Theme.Palette.textPrimary)
                }
                .padding(.horizontal, Theme.Space.s4)

                DailyNoteCard(day: day)
                    .padding(.horizontal, Theme.Space.s4)

                VStack(alignment: .leading, spacing: Theme.Space.s2) {
                    Text("Tasks")
                        .font(Theme.Typography.h3)
                        .padding(.horizontal, Theme.Space.s4)
                    if tasks.isEmpty {
                        Text("No tasks on this day.")
                            .font(Theme.Typography.callout)
                            .foregroundStyle(Theme.Palette.textTertiary)
                            .padding(.horizontal, Theme.Space.s4)
                    }
                    ForEach(tasks) { entry in
                        TaskRow(entry: entry, today: today)
                            .padding(.horizontal, Theme.Space.s4)
                            .padding(.vertical, Theme.Space.s2)
                        Divider().padding(.leading, 48)
                    }
                    HStack(spacing: Theme.Space.s3) {
                        Image(systemName: "plus.circle.fill").foregroundStyle(Theme.Palette.accent)
                        TextField("Add a task for this day", text: $newTaskText)
                            .onSubmit {
                                let text = newTaskText.trimmingCharacters(in: .whitespaces)
                                guard !text.isEmpty else { return }
                                app.library.addInboxTask(text, scheduled: day)
                                newTaskText = ""
                            }
                            .accessibilityIdentifier("calendar.newTask")
                    }
                    .padding(Theme.Space.s4)
                }
                .padding(.vertical, Theme.Space.s3)
                .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.lg))
                .padding(.horizontal, Theme.Space.s4)
            }
            .padding(.vertical, Theme.Space.s4)
        }
        .background(Theme.Palette.canvas)
        .navigationTitle("Calendar")
        .toolbar {

            ToolbarItem(placement: .topBarTrailing) {
                Button("Today") {
                    withAnimation(Theme.Motion.snappy) { scene.calendarDay = today }
                }
                .disabled(day == today)
            }
        }
    }
}

struct DayStrip: View {
    @Binding var selection: String
    let today: String

    var body: some View {
        let days = (-21...21).map { DayKey.adding(days: $0, to: today) }
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: Theme.Space.s2) {
                    ForEach(days, id: \.self) { day in
                        DayCell(day: day, isToday: day == today, isSelected: day == selection)
                            .id(day)
                            .onTapGesture {
                                withAnimation(Theme.Motion.snappy) { selection = day }
                                Haptics.selection()
                            }
                    }
                }
                .padding(.horizontal, Theme.Space.s4)
            }
            .onAppear { proxy.scrollTo(selection, anchor: .center) }
            .onChange(of: selection) { _, new in
                withAnimation(Theme.Motion.smooth) { proxy.scrollTo(new, anchor: .center) }
            }
        }
        .frame(height: 72)
    }
}

struct DayCell: View {
    @Environment(AppModel.self) private var app
    let day: String
    let isToday: Bool
    let isSelected: Bool

    var body: some View {
        let date = DayKey.date(day) ?? Date()
        let hasNote = app.library.dailyNote(for: day) != nil
        VStack(spacing: Theme.Space.s1) {
            Text(date.formatted(.dateTime.weekday(.abbreviated)))
                .font(Theme.Typography.caption)
                .foregroundStyle(isSelected ? Theme.Palette.onAccent.opacity(0.85) : Theme.Palette.textTertiary)
            Text(date.formatted(.dateTime.day()))
                .font(.system(.title3, design: .serif).weight(.semibold))
                .foregroundStyle(isSelected ? Theme.Palette.onAccent : isToday ? Theme.Palette.accent : Theme.Palette.textPrimary)
            Circle()
                .fill(hasNote ? (isSelected ? Theme.Palette.onAccent : Theme.Palette.accent) : .clear)
                .frame(width: 5, height: 5)
        }
        .frame(width: 48, height: 68)
        .background {
            RoundedRectangle(cornerRadius: Theme.Radius.md, style: .continuous)
                .fill(isSelected ? Theme.Palette.accent : Theme.Palette.surface.opacity(isToday ? 1 : 0.6))
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
    }
}

struct DailyNoteCard: View {
    @Environment(AppModel.self) private var app
    @Environment(SceneModel.self) private var scene
    let day: String

    var body: some View {
        let note = app.library.dailyNote(for: day)
        Button {
            if let note = note ?? app.library.ensureDailyNote(for: day) { scene.open(note.id) }
        } label: {
            HStack(alignment: .top, spacing: Theme.Space.s3) {
                Image(systemName: note == nil ? "plus" : "sun.max")
                    .font(.title3)
                    .foregroundStyle(Theme.Palette.accent)
                    .frame(width: 36, height: 36)
                    .background(Theme.Palette.accent.opacity(0.12), in: Circle())
                VStack(alignment: .leading, spacing: Theme.Space.s1) {
                    Text(note == nil ? LocalizedStringKey("Start the daily note") : "Daily note")
                        .font(.headline)
                        .foregroundStyle(Theme.Palette.textPrimary)
                    Text(note.map { $0.snippet.isEmpty ? String(localized: "Empty") : $0.snippet }
                         ?? String(localized: "One page per day for thoughts, plans and sketches."))
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Theme.Palette.textTertiary)
            }
            .padding(Theme.Space.s4)
            .background(Backdrop.sand.gradient.opacity(0.5), in: RoundedRectangle(cornerRadius: Theme.Radius.lg))
            .contentShape(RoundedRectangle(cornerRadius: Theme.Radius.lg))
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("calendar.dailyNote")
    }
}
