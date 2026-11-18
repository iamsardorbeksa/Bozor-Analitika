"""Decode a Nuxt 2 `window.__NUXT__=(function(a,b,...){return {...}}(v1,v2,...));` payload into Python data.

Sites built with Nuxt ship their page data this way. The body is a JavaScript object literal whose values are
either literals or references to the function's parameters; the actual values are the call arguments.
This is a small recursive-descent parser for exactly that subset of JavaScript (no code is executed).
"""
from __future__ import annotations

import json
import re

_IDENT = re.compile(r"[A-Za-z_$][\w$]*")
_NUM = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?")


class _Parser:
    def __init__(self, src: str, env: dict):
        self.s, self.i, self.env = src, 0, env

    def ws(self):
        while self.i < len(self.s) and self.s[self.i] in " \t\r\n":
            self.i += 1

    def peek(self) -> str:
        self.ws()
        return self.s[self.i] if self.i < len(self.s) else ""

    def eat(self, ch: str):
        if self.peek() != ch:
            raise ValueError(f"expected {ch!r} at {self.i}: {self.s[self.i:self.i + 40]!r}")
        self.i += 1

    def value(self):
        c = self.peek()
        if c == "{":
            return self.obj()
        if c == "[":
            return self.arr()
        if c == '"' or c == "'":
            return self.string()
        m = _NUM.match(self.s, self.i)
        if m and (c.isdigit() or c in "-."):
            self.i = m.end()
            t = m.group(0)
            return float(t) if any(x in t for x in ".eE") else int(t)
        m = _IDENT.match(self.s, self.i)
        if not m:
            raise ValueError(f"unexpected {self.s[self.i:self.i + 40]!r}")
        self.i = m.end()
        name = m.group(0)
        if name == "true":
            return True
        if name in ("false",):
            return False
        if name in ("null", "undefined"):
            return None
        if name == "void":
            self.value()  # void 0
            return None
        if name in ("Array", "Object") and self.peek() == "(":  # Array(n) placeholder
            depth = 0
            while self.i < len(self.s):
                ch = self.s[self.i]
                self.i += 1
                depth += ch == "("
                depth -= ch == ")"
                if depth == 0:
                    break
            return []
        return self.env.get(name)

    def string(self) -> str:
        q = self.s[self.i]
        j = self.i + 1
        out = []
        while j < len(self.s):
            ch = self.s[j]
            if ch == "\\":
                out.append(self.s[j:j + 2] if self.s[j + 1] != "u" else self.s[j:j + 6])
                j += 2 if self.s[j + 1] != "u" else 6
                continue
            if ch == q:
                break
            out.append('\\"' if ch == '"' else ch)
            j += 1
        self.i = j + 1
        return json.loads('"' + "".join(out).replace("\\'", "'") + '"')

    def key(self) -> str:
        c = self.peek()
        if c in "\"'":
            return self.string()
        m = _IDENT.match(self.s, self.i) or _NUM.match(self.s, self.i)
        if not m:
            raise ValueError(f"bad key at {self.i}")
        self.i = m.end()
        return m.group(0)

    def obj(self) -> dict:
        self.eat("{")
        out = {}
        while self.peek() != "}":
            k = self.key()
            self.eat(":")
            out[k] = self.value()
            if self.peek() == ",":
                self.i += 1
        self.eat("}")
        return out

    def arr(self) -> list:
        self.eat("[")
        out = []
        while self.peek() != "]":
            out.append(self.value())
            if self.peek() == ",":
                self.i += 1
        self.eat("]")
        return out


def decode(html: str) -> dict | None:
    """The page's __NUXT__ state as a dict, or None if the page has none / it can't be parsed.

    The function body may start with assignments before `return` (e.g. `iC[0]={...};iC[1]=...;`):
    they fill arrays/objects passed in as arguments, so they are applied to the environment first."""
    m = re.search(r"window\.__NUXT__=\(function\(([^)]*)\)\{", html)
    if not m:
        return None
    params = [p.strip() for p in m.group(1).split(",")]
    body_start = m.end()
    call = html.find("}}(", body_start)
    end = html.find("));</script>", call)
    if call < 0 or end < 0:
        return None
    args = _Parser("[" + html[call + 3:end] + "]", {}).arr()
    env = dict(zip(params, args))
    body = _Parser(html[body_start:call + 1], env)
    # statements before `return`: ident[index]=value; or ident.key=value;
    while True:
        body.ws()
        if body.s.startswith("return", body.i):
            body.i += len("return")
            break
        mm = _IDENT.match(body.s, body.i)
        if not mm:
            return None
        body.i = mm.end()
        target = env.get(mm.group(0))
        if target is None:
            target = env[mm.group(0)] = {}
        if body.peek() == "[":
            body.i += 1
            idx = body.value()
            body.eat("]")
        else:
            body.eat(".")
            km = _IDENT.match(body.s, body.i)
            idx = km.group(0)
            body.i = km.end()
        body.eat("=")
        val = body.value()
        if isinstance(target, list) and isinstance(idx, int):
            target.extend([None] * (idx + 1 - len(target)))
            target[idx] = val
        elif isinstance(target, dict):
            target[idx] = val
        if body.peek() == ";":
            body.i += 1
    return body.obj()
