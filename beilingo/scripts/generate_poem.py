import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

# ============ 配置（仅从环境变量读取密钥） ============
API_KEY = os.environ.get("DEEPSEEK_API_KEY")
if not API_KEY:
    sys.exit("错误：未设置环境变量 DEEPSEEK_API_KEY，请先 export DEEPSEEK_API_KEY=你的密钥")

API_URL = "https://api.deepseek.com/v1/chat/completions"
MODEL = "deepseek-chat"
MAX_TOKEN_EXPONENT = 14

POEMS_FILE = Path(r"C:\Users\lijim\WebstormProjects\NCGD243.github.io\beilingo\scripts\poems.txt")
OUTPUT_BASE = Path("../js/data")

PROMPT_TEMPLATE = open(
    r"C:\Users\lijim\WebstormProjects\NCGD243.github.io\beilingo\scripts\generate_poem_command.txt",
    "r", encoding="utf-8"
).read()


def log(level: str, message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {message}")


def load_poems(path: Path) -> list[tuple[str, str]]:
    """读取 poems.txt，每行格式：诗名,年级。返回 [(诗名, 年级), ...]。"""
    items = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        parts = re.split(r"[,，]", line, maxsplit=1)
        poem = parts[0].strip()
        grade = parts[1].strip() if len(parts) > 1 and parts[1].strip() else "未分类"
        if not poem:
            log("警告", f"poems.txt 第 {lineno} 行诗名为空，已跳过")
            continue
        items.append((poem, grade))
    return items


def call_deepseek(prompt: str, max_retries: int = 5) -> str:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    accumulated = ""
    messages = [{"role": "user", "content": prompt}]
    attempt = 0

    while attempt < max_retries:
        payload = {
            "model": MODEL,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 2 ** MAX_TOKEN_EXPONENT,
        }
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=180)
        resp.raise_for_status()

        declared = resp.headers.get("Content-Length")
        actual = len(resp.content)
        if declared is not None and int(declared) != actual:
            attempt += 1
            log("警告", f"响应体不完整（声明 {declared} 字节，实收 {actual} 字节），第 {attempt} 次重试 ...")
            time.sleep(1.5 * attempt)
            continue

        choice = resp.json()["choices"][0]
        finish_reason = choice.get("finish_reason")
        content = choice["message"]["content"]
        accumulated += content

        if finish_reason != "length":
            log("成功", f"生成完成（finish_reason={finish_reason}，共 {len(accumulated)} 字符）")
            return accumulated

        attempt += 1
        log("警告", f"输出被截断（finish_reason=length），已生成 {len(accumulated)} 字符，第 {attempt} 次续写 ...")
        messages = [
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": accumulated},
            {
                "role": "user",
                "content": (
                    "你上一次的输出因为长度限制被截断了。请从截断处继续输出剩余的 JSON 内容，"
                    "不要重复任何已经输出过的内容，不要添加任何额外说明，只输出 JSON 的剩余部分。"
                ),
            },
        ]

    raise RuntimeError(
        f"重试 {max_retries} 次后仍未获得完整响应，累计 {len(accumulated)} 字符。"
        f"建议拆分请求（s1+s2 一次、s3+s4 一次）。"
    )


def clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def try_close_json(text: str) -> str:
    """补全末尾缺失的引号和闭合括号，并清理零宽字符。"""
    text = text.replace("\ufeff", "").replace("\u200b", "").replace("\u200c", "")
    text = text.rstrip()
    stack = []
    in_str = False
    esc = False
    for ch in text:
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch in "{[":
                stack.append(ch)
            elif ch in "}]":
                if stack and ((ch == "}" and stack[-1] == "{") or (ch == "]" and stack[-1] == "[")):
                    stack.pop()
    if in_str:
        text += '"'
    for ch in reversed(stack):
        text += "}" if ch == "{" else "]"
    return text


def fix_unescaped_quotes(text: str) -> str:
    """
    修复字符串值内部未转义的英文双引号：把出现在字符串内部、前后不是 JSON 结构分隔符的 " 替换为中文引号。
    策略：逐字符扫描，处于字符串内且遇到 " 时，看后一个非空白字符是否为 : , } ]，若是则视为字符串结束，
    否则视为内容引号，替换为 “ 或 ”（根据是否已有左引号）。
    """
    out = []
    in_str = False
    esc = False
    left_quote_open = False
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if in_str:
            if esc:
                out.append(ch)
                esc = False
            elif ch == "\\":
                out.append(ch)
                esc = True
            elif ch == '"':
                j = i + 1
                while j < n and text[j] in " \t\r\n":
                    j += 1
                if j < n and text[j] in ":,}]":
                    out.append('"')
                    in_str = False
                    left_quote_open = False
                else:
                    out.append("”" if left_quote_open else "“")
                    left_quote_open = not left_quote_open
            else:
                out.append(ch)
        else:
            if ch == '"':
                in_str = True
                left_quote_open = False
            out.append(ch)
        i += 1
    return "".join(out)


def main():
    poems = load_poems(POEMS_FILE)
    total = len(poems)
    log("信息", f"共 {total} 首诗待生成，输出目录：{OUTPUT_BASE}")
    print("=" * 72)

    ok = 0
    failed = []

    for idx, (poem, grade) in enumerate(poems, start=1):
        log("信息", f"[{idx}/{total}] 开始生成《{poem}》（{grade}）")
        prompt = PROMPT_TEMPLATE.replace("{{诗名}}", poem)
        raw = call_deepseek(prompt)
        cleaned = clean_json(raw)

        data = None
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e1:
            log("警告", f"首次解析失败：{e1}，尝试补全末尾 ...")
            try:
                data = json.loads(try_close_json(cleaned))
                log("成功", "补全末尾后解析成功")
            except json.JSONDecodeError as e2:
                log("警告", f"补全末尾仍失败：{e2}，尝试修复未转义引号 ...")
                try:
                    data = json.loads(fix_unescaped_quotes(cleaned))
                    log("成功", "修复引号后解析成功")
                except json.JSONDecodeError as e3:
                    log("错误", f"修复引号后仍失败：{e3}")
                    debug_path = Path(f"debug_{poem}.txt")
                    debug_path.write_text(raw, encoding="utf-8")
                    log("信息", f"原始响应已保存至 {debug_path}")
                    failed.append(poem)
                    print("-" * 72)
                    continue

        out_dir = OUTPUT_BASE / grade / poem
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "poem.json"
        out_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log("成功", f"已写入 {out_path}")
        ok += 1
        print("-" * 72)
        time.sleep(1.5)

    print("=" * 72)
    log("完成", f"成功 {ok} 首，失败 {len(failed)} 首。")
    if failed:
        log("列表", "失败诗目：" + "，".join(failed))


if __name__ == "__main__":
    main()
    log("完成", "所有诗文已生成完毕。")