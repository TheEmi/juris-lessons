import { lessonByName } from "./catalog.js";

export function open(name, headline, children) {
    const lesson = lessonByName(name);
    return {
        article: {
            className: "sheet",
            children: [
                { p: { className: "kicker", textContent: `${lesson.book}  ·  ${lesson.n}` } },
                { h1: { textContent: headline } },
                ...children,
            ],
        },
    };
}

export function lede(text) {
    return { p: { className: "lede", textContent: text } };
}

export function prose(text) {
    return { p: { className: "prose", textContent: text } };
}

// parts: strings, or { code }, { em }, { a, href }.
export function rich(parts) {
    return {
        p: {
            className: "prose",
            children: parts.map((part) => {
                if (typeof part === "string") return part;
                if (part.code) return { code: { textContent: part.code } };
                if (part.em) return { em: { textContent: part.em } };
                if (part.a) {
                    return {
                        a: {
                            href: part.href,
                            textContent: part.a,
                            target: "_blank",
                            rel: "noreferrer",
                        },
                    };
                }
                return part;
            }),
        },
    };
}

export function code(filename, source) {
    const text = source.replace(/^\n/, "").replace(/\n$/, "");
    const lines = text.split("\n");
    const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length);
    const cut = indents.length ? Math.min(...indents) : 0;
    const body = lines.map((line) => (line.startsWith(" ".repeat(cut)) ? line.slice(cut) : line.trimStart())).join("\n");
    return {
        figure: {
            className: "codeblock",
            children: [
                { figcaption: { textContent: filename } },
                { pre: { children: [{ code: { textContent: body } }] } },
            ],
        },
    };
}

export function note(text) {
    return { aside: { className: "note", children: [{ p: { textContent: text } }] } };
}

export function pull(text) {
    return { blockquote: { className: "pull", textContent: text } };
}

export function table(headers, rows) {
    return {
        div: {
            className: "table-wrap",
            children: [{
                table: {
                    children: [
                        { thead: { children: [{ tr: { children: headers.map((header) => ({ th: { textContent: header } })) } }] } },
                        {
                            tbody: {
                                children: rows.map((row) => ({
                                    tr: { children: row.map((cell) => ({ td: { textContent: cell } })) },
                                })),
                            },
                        },
                    ],
                },
            }],
        },
    };
}

export function h2(text) {
    return { h2: { textContent: text } };
}
