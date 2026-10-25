"""Incremental Graphify update for changed documentation (D-29).

The Graphify git hook only rebuilds the graph for code changes, so every
commit that touches docs must refresh the graph here, in two steps around
the semantic extraction that the Claude Code session itself performs:

    python tools/graphify_docs.py prepare
        Detects changed docs, runs the structural pass on them, checks the
        semantic cache and prints the files that still need extraction,
        split into chunks with the absolute chunk paths to write.

    (dispatch one general-purpose subagent per chunk with the prompt from
     .claude/skills/graphify/references/extraction-spec.md)

    python tools/graphify_docs.py finish
        Verifies coverage, caches results, merges them into graph.json,
        re-clusters (carrying community names over), regenerates the report
        and HTML, saves the manifest and cleans temporary files.

    python tools/graphify_docs.py label [names.json]
        Lists communities with sample nodes; with a JSON file of
        {"<community id>": "name"} applies human-readable names. Review the
        names after every rebuild (finish or 'graphify update .' re-cluster).

Run with Graphify's interpreter: "$(cat graphify-out/.graphify_python)".
"""

import collections
import glob
import json
import sys
from pathlib import Path

ROOT = Path(".")
OUT = Path("graphify-out")
SPEC = Path(".claude/skills/graphify/references/extraction-spec.md").resolve()
SEMANTIC_TYPES = ("document", "paper", "image")
CHUNK_MAX_FILES = 20
CHUNK_MAX_LINES = 5000

TEMP_FILES = [
    ".graphify_incremental.json", ".graphify_detect.json", ".graphify_ast.json",
    ".graphify_extract.json", ".graphify_cached.json", ".graphify_uncached.txt",
    ".graphify_partial.txt", ".graphify_old.json", ".needs_update",
]


def _read(name):
    return json.loads((OUT / name).read_text(encoding="utf-8"))


def _write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def _line_count(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return sum(1 for _ in f)


def prepare():
    from graphify.cache import check_semantic_cache
    from graphify.detect import detect_incremental
    from graphify.extract import extract
    from graphify.paths import out_path
    from graphify.watch import _read_build_excludes, _read_build_gitignore

    for stale in OUT.glob(".graphify_chunk_*.json"):
        stale.unlink()

    inc = detect_incremental(ROOT, extra_excludes=_read_build_excludes(out_path()),
                             gitignore=_read_build_gitignore(out_path()))
    _write(".graphify_incremental.json", inc)
    new_files = inc.get("new_files", {})
    deleted = inc.get("deleted_files", [])
    if not inc.get("new_total") and not deleted:
        print("Graph is up to date: no changed files.")
        return
    if new_files.get("code"):
        print("Changed code files present - run 'graphify update .' for them as well.")

    _write(".graphify_detect.json", {
        "files": new_files, "all_files": inc.get("files", {}),
        "total_files": inc.get("new_total", 0), "total_words": inc.get("total_words", 0),
        "skipped_sensitive": inc.get("skipped_sensitive", []), "needs_graph": True,
    })

    docs = [f for t in SEMANTIC_TYPES for f in new_files.get(t, [])]
    ast = extract([Path(f) for f in docs], cache_root=ROOT, root=ROOT) if docs else \
        {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}
    _write(".graphify_ast.json", ast)

    cn, ce, ch, uncached = check_semantic_cache(docs, root=str(ROOT), prompt_file=str(SPEC))
    cached_path = OUT / ".graphify_cached.json"
    cached_path.unlink(missing_ok=True)
    if cn or ce or ch:
        _write(".graphify_cached.json", {"nodes": cn, "edges": ce, "hyperedges": ch})
    (OUT / ".graphify_uncached.txt").write_text("\n".join(uncached), encoding="utf-8")

    print(f"Changed docs: {len(docs)}, deleted: {len(deleted)}, need extraction: {len(uncached)}")
    chunks, cur, lines = [], [], 0
    for f in uncached:
        n = _line_count(f)
        if cur and (len(cur) >= CHUNK_MAX_FILES or lines + n > CHUNK_MAX_LINES):
            chunks.append(cur)
            cur, lines = [], 0
        cur.append(f)
        lines += n
    if cur:
        chunks.append(cur)
    for i, chunk in enumerate(chunks, 1):
        print(f"\nChunk {i} of {len(chunks)} -> {(OUT / f'.graphify_chunk_{i:02d}.json').resolve()}")
        for f in chunk:
            print(f"  {f}")
    if chunks:
        print(f"\nExtraction prompt: {SPEC}")
    print("Then run: finish")


def finish():
    from graphify.analyze import god_nodes, graph_diff, suggest_questions, surprising_connections
    from graphify.build import build_from_json, build_merge
    from graphify.cache import save_semantic_cache
    from graphify.cli import _stamped_manifest_files
    from graphify.cluster import cluster, score_all
    from graphify.detect import save_manifest
    from graphify.export import to_json
    from graphify.paths import load_node_link_graph
    from graphify.report import generate

    inc = _read(".graphify_incremental.json")
    uncached = [l for l in (OUT / ".graphify_uncached.txt").read_text(encoding="utf-8").splitlines() if l]

    nodes, edges, hyper, partial = [], [], [], []
    for c in sorted(glob.glob(str(OUT / ".graphify_chunk_*.json"))):
        d = json.loads(Path(c).read_text(encoding="utf-8"))
        nodes += d.get("nodes", [])
        edges += d.get("edges", [])
        hyper += d.get("hyperedges", [])
        for src, n in (d.get("coverage") or {}).items():
            if Path(src).is_file() and int(n) < _line_count(src):
                partial.append(src)
    reported = {n.get("source_file") for n in nodes}
    missing = [f for f in uncached if f not in reported]
    if missing:
        sys.exit(f"Chunks are missing extraction for: {missing}")
    if partial:
        print(f"WARNING: partly read, will be retried next run: {partial}")
    save_semantic_cache(nodes, edges, hyper, root=str(ROOT), allowed_source_files=uncached,
                        prompt_file=str(SPEC), partial_source_files=partial)

    cached = _read(".graphify_cached.json") if (OUT / ".graphify_cached.json").exists() else \
        {"nodes": [], "edges": [], "hyperedges": []}
    sem_nodes, seen = [], set()
    for n in cached["nodes"] + nodes:
        if n["id"] not in seen:
            seen.add(n["id"])
            sem_nodes.append({**n, "_origin": n.get("_origin", "semantic")})
    sem_edges = [{**e, "_origin": e.get("_origin", "semantic")} for e in cached["edges"] + edges]
    ast = _read(".graphify_ast.json")
    merged_nodes, seen = list(ast["nodes"]), {n["id"] for n in ast["nodes"]}
    for n in sem_nodes:
        if n["id"] not in seen:
            merged_nodes.append(n)
            seen.add(n["id"])
    new = {"nodes": merged_nodes, "edges": ast["edges"] + sem_edges,
           "hyperedges": cached.get("hyperedges", []) + hyper, "input_tokens": 0, "output_tokens": 0}

    old = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
    G = build_merge([new], graph_path=str(OUT / "graph.json"),
                    prune_sources=list(inc.get("deleted_files", [])) or None, root=str(ROOT), directed=False)
    extraction = {
        "nodes": [{"id": n, **d} for n, d in G.nodes(data=True)],
        "edges": [{**{k: v for k, v in d.items() if k not in ("_src", "_tgt", "source", "target")},
                   "source": d.get("_src", u), "target": d.get("_tgt", v)} for u, v, d in G.edges(data=True)],
        "hyperedges": list(G.graph.get("hyperedges", [])), "input_tokens": 0, "output_tokens": 0,
    }

    # Replace-on-re-extract drops the old nodes of every changed/deleted file.
    # Only those may disappear; anything else vanishing is a real loss.
    touched = {str(Path(f).resolve().relative_to(ROOT.resolve()))
               for t in SEMANTIC_TYPES for f in inc.get("new_files", {}).get(t, [])}
    touched |= {str(Path(f).resolve().relative_to(ROOT.resolve())) for f in inc.get("deleted_files", [])}
    kept = {n["id"] for n in extraction["nodes"]}
    lost = [n for n in old["nodes"] if n["id"] not in kept]
    foreign = [n["id"] for n in lost if n.get("source_file") not in touched]
    if foreign:
        sys.exit(f"Refusing to write: nodes from unchanged files would be lost: {foreign[:20]}")

    G = build_from_json(extraction, root=str(ROOT), directed=False)
    comms = cluster(G)
    cohesion = score_all(G, comms)
    old_names = {n["id"]: n.get("community_name") for n in old["nodes"]}
    labels, used = {}, collections.Counter()
    for cid, ids in comms.items():
        votes = collections.Counter(old_names.get(i) for i in ids if old_names.get(i))
        name = votes.most_common(1)[0][0] if votes else "Новая группа"
        used[name] += 1
        labels[cid] = name if used[name] == 1 else f"{name} ({used[name]})"
    detection = _read(".graphify_detect.json")
    questions = suggest_questions(G, comms, labels)
    to_json(G, comms, str(OUT / "graph.json"), force=True, community_labels=labels)
    (OUT / "GRAPH_REPORT.md").write_text(
        generate(G, comms, cohesion, labels, god_nodes(G), surprising_connections(G, comms), detection,
                 {"input": 0, "output": 0}, str(ROOT), suggested_questions=questions), encoding="utf-8")
    (OUT / ".graphify_labels.json").write_text(
        json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding="utf-8")

    manifest = _stamped_manifest_files(inc["files"], new, ROOT, partial_source_files=set(partial))
    dispatched = {f for t, fl in inc.get("new_files", {}).items() if t in SEMANTIC_TYPES for f in fl}
    stamped = {f for fl in manifest.values() for f in fl}
    save_manifest(manifest, root=str(ROOT), scan_corpus={f for fl in inc["files"].values() for f in fl},
                  clear_semantic=(dispatched - stamped) or None)

    print(graph_diff(load_node_link_graph(old), G)["summary"])
    print(f"Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(comms)} communities")
    print("New group names to review:", [v for v in labels.values() if v == "Новая группа"] or "none")

    for name in TEMP_FILES:
        (OUT / name).unlink(missing_ok=True)
    for c in OUT.glob(".graphify_chunk_*.json"):
        c.unlink()
    print("Done. Now run: graphify export html")


def label():
    """Without an argument: list communities with sample nodes.
    With a JSON file {"<community id>": "name", ...}: apply the names to
    graph.json, the labels sidecar and GRAPH_REPORT.md."""
    from graphify.analyze import god_nodes, suggest_questions, surprising_connections
    from graphify.cluster import score_all
    from graphify.paths import load_node_link_graph
    from graphify.report import generate

    data = json.loads((OUT / "graph.json").read_text(encoding="utf-8"))
    comms = collections.defaultdict(list)
    for n in data["nodes"]:
        if n.get("community") is not None:
            comms[int(n["community"])].append(n)
    if len(sys.argv) < 3:
        for cid in sorted(comms):
            sample = "; ".join(n.get("label", "")[:32] for n in comms[cid][:8])
            print(f"{cid} | {comms[cid][0].get('community_name')} | {len(comms[cid])} | {sample}")
        return

    names = {int(k): v for k, v in json.loads(Path(sys.argv[2]).read_text(encoding="utf-8")).items()}
    labels = {cid: names.get(cid, comms[cid][0].get("community_name") or f"Community {cid}") for cid in comms}
    for n in data["nodes"]:
        if n.get("community") is not None:
            n["community_name"] = labels[int(n["community"])]
    (OUT / "graph.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    (OUT / ".graphify_labels.json").write_text(
        json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding="utf-8")

    G = load_node_link_graph(data)
    communities = {cid: [n["id"] for n in ns] for cid, ns in comms.items()}
    detection = {"total_files": len({n.get("source_file") for n in data["nodes"]}), "total_words": 0,
                 "files": {}, "skipped_sensitive": []}
    (OUT / "GRAPH_REPORT.md").write_text(
        generate(G, communities, score_all(G, communities), labels, god_nodes(G),
                 surprising_connections(G, communities), detection, {"input": 0, "output": 0}, str(ROOT),
                 suggested_questions=suggest_questions(G, communities, labels)), encoding="utf-8")
    print(f"Applied {len(names)} names. Now run: graphify export html")


if __name__ == "__main__":
    commands = {"prepare": prepare, "finish": finish, "label": label}
    commands.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
