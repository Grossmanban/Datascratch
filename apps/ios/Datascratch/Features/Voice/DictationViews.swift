import SwiftUI

/// D-65: the microphone in the document's bottom bar. Hold to speak; while held it glows in the
/// accent with a wave that follows the voice, and offers «↑ lock» and «‹ cancel». Hands free, it
/// turns into «Stop» with «Cancel» beside it.
struct DictationButton: View {
    @Bindable var dictation: DictationController
    var isCompact = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drag: CGSize = .zero

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
        .background {
            if !recording { Circle().fill(.clear).glassEffect(.regular.interactive(), in: .circle) }
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
        DragGesture(minimumDistance: 0)
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

/// What is heard and not in the text yet: grey italic above the bar, with a live dot while the
/// voice is recorded and a quiet spinner while the server works on it.
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
        if let text {
            HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s2) {
                if dictation.isRecording {
                    Circle()
                        .fill(Theme.Palette.accent)
                        .frame(width: 7, height: 7)
                        .phaseAnimator([1.0, 0.35]) { dot, phase in dot.opacity(reduceMotion ? 1 : phase) } animation: { _ in .easeInOut(duration: 0.7) }
                } else {
                    ProgressView().controlSize(.mini)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(text.isEmpty ? String(localized: "Listening…") : text)
                        .font(Theme.Typography.body.italic())
                        .foregroundStyle(Theme.Palette.textSecondary)
                        .lineLimit(3)
                        .truncationMode(.head)
                    if let stage = stageText {
                        Text(stage)
                            .font(Theme.Typography.caption.weight(.medium))
                            .foregroundStyle(Theme.Palette.accent)
                            .accessibilityIdentifier("dictation.stage")
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.vertical, Theme.Space.s2)
            .padding(.horizontal, Theme.Space.s3)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))
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

/// The consent sheet and the queue's notices for a document's microphone.
struct DictationSheets: ViewModifier {
    @Bindable var dictation: DictationController

    func body(content: Content) -> some View {
        content
            .sheet(isPresented: $dictation.showsConsent) {
                VoiceConsentSheet { dictation.consentAccepted() } onDecline: { dictation.consentDeclined() }
            }
            .onChange(of: dictation.queue.notice) { _, notice in
                if notice != nil { dictation.takeQueueNotice() }
            }
    }
}
