import SwiftUI

/// D-65: the microphone in the document's bottom bar. Hold to speak; while held it glows in the
/// accent with a wave that follows the voice, and offers «↑ lock» and «‹ cancel». Hands free, it
/// turns into «Stop» with «Cancel» beside it.
struct DictationButton: View {
    @Bindable var dictation: DictationController
    var isCompact = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drag: CGSize = .zero
    /// A finger is on the button. Unlike `onEnded`, it also goes back when the system cancels the
    /// drag; a stale `drag` would then swallow the first «Stop».
    @GestureState private var touching = false

    /// How far up locks hands free, how far left cancels.
    private let lockDistance: CGFloat = 70
    private let cancelDistance: CGFloat = 90

    private var size: CGFloat { isCompact ? 34 : 40 }

    var body: some View {
        HStack(spacing: Theme.Space.s2) {
            if dictation.mode == .locked {
                Button { dictation.cancel() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .frame(width: size - 8, height: size - 8)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .accessibilityLabel("Cancel Dictation")
                .accessibilityIdentifier("dictation.cancel")
                .transition(.scale.combined(with: .opacity))
            }
            mic
        }
        .animation(reduceMotion ? nil : Theme.Motion.snappy, value: dictation.mode)
    }

    private var mic: some View {
        let recording = dictation.isRecording
        let level = CGFloat(dictation.level)
        return ZStack {
            if recording && !reduceMotion {
                // The wave: rings that swell with the voice, each a little later and fainter.
                ForEach(0..<3, id: \.self) { ring in
                    Circle()
                        .stroke(Theme.Palette.accent.opacity(0.35 - Double(ring) * 0.1), lineWidth: 2)
                        .frame(width: size, height: size)
                        .scaleEffect(1 + level * (0.35 + CGFloat(ring) * 0.3))
                        .animation(.easeOut(duration: 0.12 + Double(ring) * 0.06), value: level)
                }
            }
            Circle()
                .fill(recording ? AnyShapeStyle(Theme.Palette.accent) : AnyShapeStyle(Color.clear))
                .frame(width: size, height: size)
                .shadow(color: Theme.Palette.accent.opacity(recording ? 0.45 + Double(level) * 0.3 : 0),
                        radius: recording ? 8 + level * 14 : 0)
            Image(systemName: dictation.mode == .locked ? "stop.fill" : "mic.fill")
                .font(.system(size: isCompact ? 14 : 16, weight: .semibold))
                .foregroundStyle(recording ? Color.white : Theme.Palette.textSecondary)
                .contentTransition(.symbolEffect(.replace))
        }
        .frame(width: size, height: size)
        // Always there, faded while recording: glass appearing and going under a held finger
        // tripped UIKit's focus system on removal.
        .background {
            Circle().fill(.clear).glassEffect(.regular, in: .circle).opacity(recording ? 0 : 1)
        }
        .scaleEffect(dictation.mode == .holding ? 1.12 : 1)
        .offset(x: dictation.mode == .holding ? min(0, drag.width) * 0.3 : 0,
                y: dictation.mode == .holding ? min(0, drag.height) * 0.3 : 0)
        .overlay(alignment: .top) {
            if dictation.mode == .holding { lockHint.offset(y: -size - 18) }
        }
        .overlay(alignment: .trailing) {
            if dictation.mode == .holding { cancelHint.offset(x: -size - 14) }
        }
        .contentShape(Circle())
        .gesture(holdGesture)
        .onChange(of: touching) { _, now in
            // After `onEnded` (when it comes), so a drag that ended normally is judged as before;
            // a cancelled hold sends its piece as a lifted finger would.
            guard !now else { return }
            Task { @MainActor in
                drag = .zero
                if dictation.mode == .holding { dictation.release() }
            }
        }
        .accessibilityElement()
        .accessibilityLabel(dictation.mode == .locked ? Text("Stop Dictation") : Text("Dictate"))
        .accessibilityHint("Hold to dictate. Swipe up to keep recording hands free, swipe left to cancel.")
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            if dictation.mode == .locked { dictation.stop() } else { dictation.startHandsFree() }
        }
        .accessibilityIdentifier("dictation.mic")
    }

    private var holdGesture: some Gesture {
        // Global: the button moves a little with the finger (offset), which must not change the drag.
        DragGesture(minimumDistance: 0, coordinateSpace: .global)
            .onChanged { value in
                switch dictation.mode {
                case .idle:
                    if drag == .zero { dictation.press() }
                    drag = value.translation
                case .holding:
                    drag = value.translation
                    if value.translation.width < -cancelDistance {
                        dictation.cancel()
                    } else if value.translation.height < -lockDistance {
                        dictation.lock()
                    }
                case .locked:
                    break
                }
            }
            .updating($touching) { _, touching, _ in touching = true }
            .onEnded { value in
                let wasTap = abs(value.translation.width) < 8 && abs(value.translation.height) < 8
                switch dictation.mode {
                case .holding: dictation.release()
                // A tap on «Stop» (the finger that locked it has been lifted already).
                case .locked where wasTap && drag == .zero: dictation.stop()
                default: break
                }
                drag = .zero
            }
    }

    private var lockHint: some View {
        let progress = min(1, max(0, -drag.height / lockDistance))
        return VStack(spacing: 2) {
            Image(systemName: progress >= 1 ? "lock.fill" : "lock.open")
            Image(systemName: "chevron.up").font(.system(size: 9, weight: .bold))
        }
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(progress > 0.5 ? Theme.Palette.accent : Theme.Palette.textSecondary)
        .padding(.vertical, 8)
        .padding(.horizontal, 7)
        .glassEffect(.regular, in: .capsule)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .accessibilityHidden(true)
    }

    private var cancelHint: some View {
        let progress = min(1, max(0, -drag.width / cancelDistance))
        return HStack(spacing: 4) {
            Image(systemName: "chevron.left").font(.system(size: 10, weight: .bold))
            Text("Slide to cancel")
        }
        .font(Theme.Typography.caption.weight(.medium))
        .foregroundStyle(progress > 0.6 ? Theme.Palette.danger : Theme.Palette.textSecondary)
        .opacity(1 - Double(progress) * 0.4)
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .glassEffect(.regular, in: .capsule)
        .fixedSize()
        .transition(.move(edge: .trailing).combined(with: .opacity))
        .accessibilityHidden(true)
    }
}

/// The dictation's step above the bar: «Listening…» with a live dot while the voice is recorded,
/// then the server's step with a quiet spinner. What is heard shows grey at the caret.
struct DictationPreview: View {
    let dictation: DictationController
    let text: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// What the server is doing with the earliest piece still out.
    private var stageText: String? {
        switch dictation.queue.stage {
        case .recognising?: String(localized: "Recognising…")
        case .tidying?: String(localized: "Tidying Up…")
        default: nil
        }
    }

    var body: some View {
        // What is heard shows grey at the caret (DSEditor); here, only the step.
        if text != nil {
            HStack(spacing: Theme.Space.s2) {
                if dictation.isRecording {
                    Circle()
                        .fill(Theme.Palette.accent)
                        .frame(width: 7, height: 7)
                        .phaseAnimator([1.0, 0.35]) { dot, phase in dot.opacity(reduceMotion ? 1 : phase) } animation: { _ in .easeInOut(duration: 0.7) }
                } else {
                    ProgressView().controlSize(.mini)
                }
                Text(stageText ?? String(localized: "Listening…"))
                    .font(Theme.Typography.footnote.weight(.medium))
                    .foregroundStyle(stageText == nil ? Theme.Palette.textSecondary : Theme.Palette.accent)
                    .contentTransition(.opacity)
                    .accessibilityIdentifier("dictation.stage")
            }
            .padding(.vertical, Theme.Space.s2)
            .padding(.horizontal, Theme.Space.s3)
            .glassEffect(.regular, in: .capsule)
            .padding(.horizontal, Theme.Space.s3)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("dictation.preview")
        }
    }
}

/// A calm line about the last piece (offline, quota, microphone off).
struct DictationMessage: View {
    let text: String

    var body: some View {
        Label(text, systemImage: "waveform.badge.exclamationmark")
            .font(Theme.Typography.footnote)
            .foregroundStyle(Theme.Palette.textSecondary)
            .padding(.vertical, Theme.Space.s2)
            .padding(.horizontal, Theme.Space.s3)
            .glassEffect(.regular, in: .capsule)
            .padding(.horizontal, Theme.Space.s3)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .accessibilityIdentifier("dictation.message")
    }
}

/// Before the first recording: where the voice goes, plainly (the web says the same).
struct VoiceConsentSheet: View {
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s4) {
            Image(systemName: "waveform")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Theme.Palette.accent)
                .frame(width: 60, height: 60)
                .background(Theme.Palette.accent.opacity(0.12), in: .rect(cornerRadius: 18))
                .accessibilityHidden(true)
            Text("Voice Through Our Server")
                .font(Theme.Typography.h1)
                .fixedSize(horizontal: false, vertical: true)
            Text("The recording and its text pass through our server to ElevenLabs and OpenAI only to be recognised and formatted. Nothing is stored, and your notes stay encrypted.")
                .font(Theme.Typography.body)
                .foregroundStyle(Theme.Palette.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            VStack(spacing: Theme.Space.s2) {
                Button(action: onAccept) {
                    Text("Got It, Turn On")
                        .font(Theme.Typography.body.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Theme.Space.s2)
                }
                .buttonStyle(.glassProminent)
                .accessibilityIdentifier("voice.consent.accept")
                Button(action: onDecline) {
                    Text("Not Now")
                        .font(Theme.Typography.body)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Theme.Space.s2)
                }
                .buttonStyle(.glass)
                .accessibilityIdentifier("voice.consent.decline")
            }
        }
        .padding(Theme.Space.s5)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled()
    }
}

/// The queue's notices for a document's microphone, and where the consent sheet comes from: the
/// scene's sheet, not one on the document screen.
struct DictationSheets: ViewModifier {
    @Environment(SceneModel.self) private var scene
    let dictation: DictationController

    func body(content: Content) -> some View {
        content
            .onAppear {
                dictation.askForConsent = { [weak scene] in scene?.sheet = .voiceConsent }
            }
            .onChange(of: dictation.queue.notice) { _, notice in
                if notice != nil { dictation.takeQueueNotice() }
            }
    }
}

/// D-65 «How to Format?»: the way the text should read; Document first.
struct VoiceFormatSheet: View {
    let appliesToSelection: Bool
    let onPick: (VoiceStyle) -> Void
    @Environment(\.dismiss) private var dismiss

    private let styles: [VoiceStyle] = [.document, .plan, .minutes, .article, .letter, .notes]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(styles, id: \.self) { style in
                        Button { onPick(style) } label: {
                            HStack(spacing: Theme.Space.s3) {
                                Image(systemName: style.systemImage)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(Theme.Palette.accent)
                                    .frame(width: 32, height: 32)
                                    .background(Theme.Palette.accent.opacity(0.12), in: .rect(cornerRadius: 9))
                                    .accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(style.title)
                                        .font(Theme.Typography.body.weight(.medium))
                                        .foregroundStyle(Theme.Palette.textPrimary)
                                    Text(style.detail)
                                        .font(Theme.Typography.footnote)
                                        .foregroundStyle(Theme.Palette.textSecondary)
                                }
                                Spacer(minLength: 0)
                            }
                            .contentShape(.rect)
                        }
                        .accessibilityIdentifier("voice.format.\(style.rawValue)")
                    }
                } footer: {
                    Text(appliesToSelection
                         ? LocalizedStringKey("Only the selected text is formatted. The result is highlighted until you accept it.")
                         : LocalizedStringKey("The whole note is formatted. The result is highlighted until you accept it."))
                }
            }
            .navigationTitle("How to Format?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

nonisolated extension VoiceStyle {
    var systemImage: String {
        switch self {
        case .document: "doc.text"
        case .plan: "list.bullet.indent"
        case .minutes: "person.2"
        case .article: "newspaper"
        case .letter: "envelope"
        case .notes: "book"
        }
    }

    var detail: String {
        switch self {
        case .document: String(localized: "Headings, paragraphs and lists")
        case .plan: String(localized: "Steps and points to do")
        case .minutes: String(localized: "Who said what, decisions, next steps")
        case .article: String(localized: "A connected text for readers")
        case .letter: String(localized: "Greeting, body, sign-off")
        case .notes: String(localized: "Key ideas, short and structured")
        }
    }
}

/// What «Format» replaced, as it was (Markdown), with «Reject» to put it back.
struct VoiceOriginalSheet: View {
    let formatter: VoiceFormatter
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                Text(formatter.original ?? "")
                    .font(Theme.Typography.body)
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Theme.Space.s5)
                    .accessibilityIdentifier("voice.original.text")
            }
            .navigationTitle("Original Text")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
                if formatter.phase == .done {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Reject Formatting", role: .destructive) {
                            formatter.reject()
                            dismiss()
                        }
                        .accessibilityIdentifier("voice.original.reject")
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

/// «Tidying Up…» while the server formats, then «Formatted — edit highlighted» with «Show
/// Original» and «Reject» until the person types again; a calm line when it did not work.
struct FormatStatus: View {
    let formatter: VoiceFormatter
    let showOriginal: () -> Void

    var body: some View {
        switch formatter.phase {
        case .working:
            HStack(spacing: Theme.Space.s2) {
                ProgressView().controlSize(.mini)
                Text("Tidying Up…")
                    .font(Theme.Typography.footnote.weight(.medium))
                    .foregroundStyle(Theme.Palette.accent)
            }
            .padding(.vertical, Theme.Space.s2)
            .padding(.horizontal, Theme.Space.s3)
            .glassEffect(.regular, in: .capsule)
            .padding(.horizontal, Theme.Space.s3)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("voice.format.working")
        case .done:
            VStack(alignment: .leading, spacing: Theme.Space.s2) {
                Label("Formatted — edit highlighted", systemImage: "wand.and.sparkles")
                    .font(Theme.Typography.footnote.weight(.medium))
                    .foregroundStyle(Theme.Palette.textPrimary)
                if let title = formatter.suggestedTitle {
                    // The note has a title of its own: the model's one only on a tap.
                    HStack(spacing: Theme.Space.s2) {
                        Text("Title: «\(title)»")
                            .font(Theme.Typography.footnote)
                            .foregroundStyle(Theme.Palette.textSecondary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityIdentifier("voice.format.title")
                        Button("Replace") { formatter.replaceTitle() }
                            .buttonStyle(.glass)
                            .font(Theme.Typography.footnote)
                            .accessibilityIdentifier("voice.format.titleReplace")
                    }
                    .transition(.opacity)
                }
                HStack(spacing: Theme.Space.s2) {
                    Button("Show Original", action: showOriginal)
                        .buttonStyle(.glass)
                        .accessibilityIdentifier("voice.format.original")
                    Button("Reject") { formatter.reject() }
                        .buttonStyle(.glass)
                        .accessibilityIdentifier("voice.format.reject")
                }
                .font(Theme.Typography.footnote)
            }
            .padding(Theme.Space.s3)
            .glassEffect(.regular, in: .rect(cornerRadius: 18))
            .padding(.horizontal, Theme.Space.s3)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .accessibilityElement(children: .contain)
            .animation(Theme.Motion.snappy, value: formatter.suggestedTitle)
            .accessibilityIdentifier("voice.format.done")
        case .idle:
            if let message = formatter.message {
                DictationMessage(text: message)
            }
        }
    }
}

/// D-65: a recording of this note not in the text yet — «Not recognised · 2:41 · Retry · Save
/// Audio · Delete», or «Recognised · Insert» when a retry got it while the note was closed. The
/// recording stays on the device until its text is in.
struct PendingDictationCards: View {
    let inbox: DictationInbox
    let noteId: String
    /// Recordings with a placeholder in the text: their card shows only once it is tapped.
    var placed: Set<String> = []
    var tapped: String?
    var onClose: () -> Void = {}

    var body: some View {
        // The first try of a piece being dictated shows in the bar, not here.
        let items = inbox.items(for: noteId).filter {
            ($0.attempts > 0 || $0.text != nil || !inbox.working.contains($0.id))
                && (!placed.contains($0.id) || $0.id == tapped)
        }
        if !items.isEmpty {
            VStack(alignment: .trailing, spacing: Theme.Space.s2) {
                ForEach(items) { item in
                    PendingDictationCard(inbox: inbox, item: item, canInsert: true,
                                         onClose: item.id == tapped ? onClose : nil)
                }
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

struct PendingDictationCard: View {
    let inbox: DictationInbox
    let item: PendingDictation
    /// The note is open: a recognised piece can go in at the caret.
    let canInsert: Bool
    /// Opened from its placeholder in the text: it can be closed again.
    var onClose: (() -> Void)?
    @State private var confirmingDelete = false

    private var isWorking: Bool { inbox.working.contains(item.id) }

    static func length(_ seconds: Double) -> String {
        let s = max(0, Int(seconds.rounded()))
        return String(format: "%d:%02d", s / 60, s % 60)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s2) {
            if item.text != nil {
                Label("Recognised · \(Self.length(item.duration))", systemImage: "waveform")
                    .font(Theme.Typography.footnote.weight(.medium))
                    .foregroundStyle(Theme.Palette.textPrimary)
                    .accessibilityIdentifier("voice.pending.title")
                if let text = item.text {
                    // Readable (and copyable) wherever the card is, also with the note gone.
                    Text(text)
                        .font(Theme.Typography.footnote)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .lineLimit(4)
                        .textSelection(.enabled)
                }
            } else {
                HStack(spacing: Theme.Space.s2) {
                    if isWorking { ProgressView().controlSize(.mini) }
                    let length = Self.length(item.duration)
                    Label(isWorking ? LocalizedStringKey("Recognising… · \(length)") : LocalizedStringKey("Not recognised · \(length)"),
                          systemImage: isWorking ? "waveform" : "exclamationmark.triangle")
                        .font(Theme.Typography.footnote.weight(.medium))
                        .foregroundStyle(Theme.Palette.textPrimary)
                        .accessibilityIdentifier("voice.pending.title")
                    if let onClose {
                        Spacer(minLength: Theme.Space.s2)
                        Button(action: onClose) {
                            Image(systemName: "xmark")
                                .font(Theme.Typography.caption.weight(.semibold))
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Close")
                        .accessibilityIdentifier("voice.pending.close")
                    }
                }
                if let code = item.lastError, !isWorking {
                    Text("The recording is kept on this device (\(code)).")
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .accessibilityIdentifier("voice.pending.code")
                }
            }
            HStack(spacing: Theme.Space.s2) {
                if item.text != nil {
                    if canInsert {
                        Button("Insert") { inbox.deliver(item.id) }
                            .buttonStyle(.glass)
                            .disabled(isWorking)
                            .accessibilityIdentifier("voice.pending.insert")
                    }
                } else {
                    Button("Retry") { inbox.retry(item.id) }
                        .buttonStyle(.glass)
                        .disabled(isWorking)
                        .accessibilityIdentifier("voice.pending.retry")
                }
                ShareLink(item: inbox.audioURL(item.id)) {
                    Text("Save Audio")
                }
                .buttonStyle(.glass)
                .accessibilityIdentifier("voice.pending.save")
                Button("Delete", role: .destructive) { confirmingDelete = true }
                    .buttonStyle(.glass)
                    .accessibilityIdentifier("voice.pending.delete")
            }
            .font(Theme.Typography.footnote)
        }
        .padding(Theme.Space.s3)
        .glassEffect(.regular, in: .rect(cornerRadius: 18))
        .padding(.horizontal, Theme.Space.s3)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("voice.pending")
        .animation(Theme.Motion.snappy, value: isWorking)
        .confirmationDialog("Delete this recording?", isPresented: $confirmingDelete, titleVisibility: .visible) {
            Button("Delete Recording", role: .destructive) { inbox.remove(item.id) }
                .accessibilityIdentifier("voice.pending.deleteConfirm")
        } message: {
            Text("What was said in it is not in the note and can’t be brought back.")
        }
    }
}
