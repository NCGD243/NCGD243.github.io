import json
from pathlib import Path
from datetime import datetime


ROOT = Path(__file__).resolve().parents[1]
DATA_DIRECTORY = ROOT / "js" / "data"
INDEX_FILE = DATA_DIRECTORY / "poems.json"
POEMS_TXT = ROOT / "scripts" / "poems.txt"

SKIP_NAMES = {"src", "poems.json"}

GRADE_ORDER = {
    "一年级": 1, "二年级": 2, "三年级": 3, "四年级": 4, "五年级": 5,
    "六年级": 6, "七年级": 7, "八年级": 8, "九年级": 9,
    "未分类": 99,
}


def log(level: str, message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {message}")


def normalize_type(raw: str) -> str:
    """把类型统一成 古文 / 诗词"""
    if any(k in raw for k in ("古文", "文言")):
        return "古文"
    return "诗词"


def load_poems_txt() -> dict[str, list[dict]]:
    """
    读取 poems.txt，每行：诗名,年级,类型
    返回 {年级: [{"name": 诗名, "type": 类型}, ...]}
    """
    groups: dict[str, list[dict]] = {}

    if not POEMS_TXT.exists():
        log("警告", f"未找到 {POEMS_TXT}，无法生成索引")
        return groups

    for lineno, raw in enumerate(POEMS_TXT.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        parts = [p.strip() for p in line.replace("，", ",").split(",")]
        if len(parts) < 3:
            log("警告", f"第 {lineno} 行格式不对，已跳过：{line}")
            continue

        name, grade, typ = parts[0], parts[1], parts[2]
        if not name or not grade:
            log("警告", f"第 {lineno} 行缺少诗名或年级，已跳过：{line}")
            continue

        groups.setdefault(grade, []).append({
            "name": name,
            "type": normalize_type(typ),
        })

    return groups


def sort_groups(groups: dict[str, list[dict]]) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    for grade in sorted(groups, key=lambda g: (GRADE_ORDER.get(g, 50), g)):
        seen = set()
        uniq = []
        for p in sorted(groups[grade], key=lambda x: x["name"]):
            if p["name"] in seen:
                continue
            seen.add(p["name"])
            uniq.append(p)
        result[grade] = uniq
    return result


def main():
    log("信息", f"正在读取诗词清单：{POEMS_TXT}")

    groups = sort_groups(load_poems_txt())
    total = sum(len(v) for v in groups.values())
    guwen = sum(1 for v in groups.values() for p in v if p["type"] == "古文")

    payload = [
        {"level": grade, "poem": poems}
        for grade, poems in groups.items()
    ]

    INDEX_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        )

    log("成功", f"已写入索引文件：{INDEX_FILE.relative_to(ROOT)}")
    log("完成", f"共收录 {len(payload)} 个年级、{total} 篇（其中古文 {guwen} 篇）。")
    for item in payload:
        log(
            "列表",
            f"{item['level']}：" + "，".join(
                f"{p['name']}（{p['type']}）" for p in item["poem"]
            ),
            )


if __name__ == "__main__":
    main()