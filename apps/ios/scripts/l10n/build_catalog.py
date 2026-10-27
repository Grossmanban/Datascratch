"""Builds Datascratch/Resources/Localizable.xcstrings (English source, Russian).

English strings are the keys used in Swift. Translations live in ru.json
(key -> Russian). Run after changing UI strings:

    python3 scripts/l10n/build_catalog.py          # writes the catalog
    python3 scripts/l10n/build_catalog.py --check  # lists untranslated UI strings, exits 1 if any

Interpolated keys are written with format specifiers (%lld, %@), as Xcode
does; their Swift spelling is mapped in INTERPOLATIONS.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCES = ROOT / "Datascratch"
CATALOG = SOURCES / "Resources" / "Localizable.xcstrings"
RU = pathlib.Path(__file__).with_name("ru.json")

# Swift literal with interpolation -> catalog key
INTERPOLATIONS = {
    r"Offline · \(pending) waiting": "Offline · %lld waiting",
    r"Not sent: \(documents)": "Not sent: %lld",
    r"\(count) documents": "%lld documents",
    r"\(app.sync.heldChanges) changes wait for a key": "%lld changes wait for a key",
    r"Unsent changes on this device: \(unsent). They will be sent after you sign in to this same account.": "Unsent changes on this device: %lld. They will be sent after you sign in to this same account.",
    r"No note called “\(title)”": "No note called “%@”",
    r"Unsent changes kept on this device: \(app.sync.pendingChanges)": "Unsent changes kept on this device: %lld",
    r"Delete documents forever: \(count)?": "Delete documents forever: %lld?",
    r"\(library.daysLeftInTrash(note)) d": "%lld d",
    r"\(library.daysLeftInTrash(note)) days left": "%lld days left",
    r"until \(expiresAt.formatted(date: .abbreviated, time: .omitted))": "until %@",
    r"Expires \(expiresAt.formatted(date: .abbreviated, time: .omitted))": "Expires %@",
    r"Switch to \(space.name)": "Switch to %@",
    r"Group \(indices.0 + 1)": "Group %lld",
    r"Group \(indices.1 + 1)": "Group %lld",
    r"\(strength) of 4": "%lld of 4",
    r"Last used \(lastUsed.formatted(.relative(presentation: .named)))": "Last used %@",
    r"\(hidden) more": "%lld more",
    r"Note \(formatter.string(from: created))": "Note %@",
    r"in “\(name)”": "in “%@”",
    r"in “\($0)”": "in “%@”",
    r"\(info.host) · \(info.version)": "%@ · %@",
}

# Literals that look like text but are not translated (names, formats, prefixes).
IGNORE = {
    "Projects", "Drafts", "Plan", "Draft", "Target", "Links", "Target body", "Go to [[Target]] or [[Nowhere]].", "Dated", "Call back", "Фото", "Файл", "Вставка", "Sample Photo", "CoverImages.didArrive", "Photo.jpg", "#tag\\(index) #group/child\\(index)",
    "* ", ", ", " · ", " : ", "> ", "[ ] ", "[] ", "☐ ", "DS1", "DS1-XXXX-XXXX-…", "Datascratch", "Library.json",
    "CFBundleShortVersionString", "CFBundleVersion", "DSServerURL", "DSWebHost", "DSExtendedMode", "MMMdy", "d MMMM y",
    "XChaCha20-Poly1305 · Argon2id", "Quiet paper", "next week", "open to agents", "CoreLibrary", "Library", "Attachments", "a^2 + b^2 = c^2", "graph TD\n  A --> B",
    # First-run space names as an older build wrote them (matched when merging duplicates).
    "Личное", "Работа", "Заметки",
}

LITERAL = re.compile(r'"((?:[^"\\\n]|\\.)*)"')
# Literals that are clearly not UI text.
NOT_UI = re.compile(r"^([a-z0-9]+([._\-][a-zA-Z0-9]+)+|[a-z]+|#?[0-9A-Fa-f]{6}|.{0,1}|[%@/:#.\-]+.*)$")


def literals():
    for path in sorted(SOURCES.rglob("*.swift")):
        for line in path.read_text().splitlines():
            stripped = line.strip()
            # Comments and diagnostics are not UI text.
            if stripped.startswith("//") or "log." in line or "Logger(" in line or "print(" in line:
                continue
            for match in LITERAL.finditer(line):
                yield match.group(1), path.name, line


def main():
    ru = json.loads(RU.read_text())
    used = {}
    suspicious = []
    for raw, file, line in literals():
        key = INTERPOLATIONS.get(raw, raw)
        if "\\(" in key:
            continue
        key = key.replace('\\"', '"').replace("\\n", "\n")
        if key in ru:
            used[key] = ru[key]
        elif key not in IGNORE and not NOT_UI.match(key) and (" " in key or key[:1].isupper()) and "Image(systemName" not in line \
                and "systemImage: \"" + raw not in line and "accessibilityIdentifier" not in line \
                and "forKey" not in line and "UserDefaults" not in line:
            suspicious.append((key, file))

    if "--check" in sys.argv:
        missing = sorted(set(suspicious))
        for key, file in missing:
            print(f"{file}: {key!r}")
        sys.exit(1 if missing else 0)

    strings = {}
    for key in sorted(used):
        strings[key] = {
            "localizations": {
                "ru": {"stringUnit": {"state": "translated", "value": used[key]}},
            }
        }
    catalog = {"sourceLanguage": "en", "strings": strings, "version": "1.0"}
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    unused = sorted(set(ru) - set(used))
    print(f"{len(used)} strings written; {len(unused)} translations unused")
    for key in unused:
        print("  unused:", key)


if __name__ == "__main__":
    main()
