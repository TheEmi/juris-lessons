import Juris from "./vendor/juris.js";
import { forms } from "./vendor/forms.js";
import { fail } from "./vendor/errors.js";
import { HeadlessManager } from "./vendor/headless.js";
import { createFluentStateHeadless } from "./vendor/fluentstate.js";

function mount(el, build) {
    const juris = build();
    return () => juris.disposeTree(el);
}

export function mountCounter(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { count: 0 } });
        juris.registerComponent("Counter", (props, api) => ({
            div: {
                className: "counter",
                children: [
                    { p: { className: "readout", textContent: () => String(api.getState("count", 0)) } },
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        textContent: "−1",
                                        disabled: () => api.getState("count", 0) === 0,
                                        onclick: () => api.updateState("count", (n) => n - 1),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "+1",
                                        onclick: () => api.updateState("count", (n) => n + 1),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Reset",
                                        disabled: () => api.getState("count", 0) === 0,
                                        onclick: () => api.setValue("count", 0),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Counter: {} });
        return juris;
    });
}

export function mountLayouts(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { tag: "p", text: "A layout is one object. The key is the tag." } });
        const tags = [
            ["p", "Paragraph"],
            ["h2", "Heading"],
            ["strong", "Strong"],
        ];
        juris.registerComponent("Switcher", (props, api) => ({
            div: {
                className: "stack",
                children: [
                    {
                        div: {
                            className: "row",
                            children: tags.map(([tag, label]) => ({
                                button: {
                                    type: "button",
                                    className: "tab",
                                    classList: { on: () => api.getState("tag") === tag },
                                    textContent: label,
                                    onclick: () => api.setValue("tag", tag),
                                },
                            })),
                        },
                    },
                    {
                        label: {
                            className: "field",
                            children: [
                                { span: { textContent: "Text" } },
                                { input: { type: "text", oninput: (event) => api.setValue("text", event.target.value) } },
                            ],
                        },
                    },
                    {
                        div: {
                            className: "layout-stage",
                            children: () => {
                                const tag = api.getState("tag", "p");
                                return { [tag]: { className: "layout-out", textContent: api.getState("text", "") } };
                            },
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Switcher: {} });
        const input = el.querySelector("input");
        if (input) input.value = juris.getState("text");
        return juris;
    });
}

const CELLS = 24;

export function mountGrain(el) {
    return mount(el, () => {
        const initial = {};
        for (let i = 0; i < CELLS; i += 1) initial[i] = 0;
        const juris = new Juris({ state: { cells: initial, last: "none yet" } });
        const runs = Array(CELLS).fill(0);
        juris.registerComponent("Grid", (props, api) => ({
            div: {
                className: "stack",
                children: [
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Touch cell 3",
                                        onclick: () => {
                                            api.setValue("last", "cells.3");
                                            api.updateState("cells.3", (n) => n + 1);
                                        },
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Touch every cell",
                                        onclick: () => {
                                            api.setValue("last", "every cell, one batch");
                                            api.batch(() => {
                                                for (let i = 0; i < CELLS; i += 1) api.updateState(`cells.${i}`, (n) => n + 1);
                                            });
                                        },
                                    },
                                },
                            ],
                        },
                    },
                    { p: { className: "hint", textContent: () => `Last write: ${api.getState("last")}` } },
                    {
                        div: {
                            className: "grid",
                            children: Array.from({ length: CELLS }, (_, i) => ({
                                button: {
                                    type: "button",
                                    className: "cell",
                                    onclick: () => {
                                        api.setValue("last", `cells.${i}`);
                                        api.updateState(`cells.${i}`, (n) => n + 1);
                                    },
                                    textContent: () => {
                                        runs[i] += 1;
                                        const value = api.getState(`cells.${i}`, 0);
                                        return `${value}\n×${runs[i]}`;
                                    },
                                },
                            })),
                        },
                    },
                    { p: { className: "hint", textContent: "The large figure is the cell’s value. × is how many times that cell’s binding has run." } },
                ],
            },
        }));
        juris.render(el, { Grid: {} });
        return juris;
    });
}

export function mountGreetings(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { greeting: "Hello", note: 0 } });
        juris.registerComponent("Greeting", (props, api) => {
            let runs = 0;
            return {
                p: {
                    className: "greet",
                    textContent: () => {
                        runs += 1;
                        return `${api.getState("greeting", "Hello")}, ${props.name}   ×${runs}`;
                    },
                },
            };
        });
        juris.registerComponent("Pair", (props, api) => ({
            div: {
                className: "stack",
                children: [
                    { div: { className: "row greet-row", children: [{ Greeting: { name: "Ada" } }, { Greeting: { name: "Grace" } }] } },
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Change the greeting",
                                        onclick: () => api.setValue("greeting", api.getState("greeting") === "Hello" ? "Good evening" : "Hello"),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Write an unread path",
                                        onclick: () => api.updateState("note", (n) => n + 1),
                                    },
                                },
                            ],
                        },
                    },
                    { p: { className: "hint", textContent: () => `note is ${api.getState("note", 0)}. Its binding ran because it read note. The greetings did not read note.` } },
                ],
            },
        }));
        juris.render(el, { Pair: {} });
        return juris;
    });
}

export function mountTodos(el) {
    return mount(el, () => {
        const juris = new Juris({
            state: {
                order: [1, 2, 3],
                items: {
                    1: { title: "Milk", done: false },
                    2: { title: "Eggs", done: true },
                    3: { title: "Bread", done: false },
                },
                draft: "",
                nextId: 4,
            },
        });
        juris.registerComponent("Todo", (props, api) => {
            let titleRuns = 0;
            let doneRuns = 0;
            const id = props.id;
            return {
                li: {
                    className: "todo",
                    children: [
                        {
                            input: {
                                type: "checkbox",
                                checked: () => Boolean(api.getState(`items.${id}.done`)),
                                onchange: () => api.updateState(`items.${id}.done`, (done) => !done),
                            },
                        },
                        {
                            span: {
                                className: "todo-title",
                                classList: { done: () => Boolean(api.getState(`items.${id}.done`)) },
                                textContent: () => {
                                    titleRuns += 1;
                                    return `${api.getState(`items.${id}.title`, "")}  ×${titleRuns}`;
                                },
                            },
                        },
                        {
                            small: {
                                className: "todo-meta",
                                textContent: () => {
                                    doneRuns += 1;
                                    api.getState(`items.${id}.done`);
                                    return `check ×${doneRuns}`;
                                },
                            },
                        },
                    ],
                },
            };
        });
        juris.registerComponent("Todos", (props, api) => ({
            div: {
                className: "stack",
                children: [
                    {
                        form: {
                            className: "row",
                            onsubmit: (event) => {
                                event.preventDefault();
                                const title = api.getState("draft", "").trim();
                                if (!title) return;
                                const id = api.getState("nextId");
                                api.batch(() => {
                                    api.setValue(`items.${id}`, { title, done: false });
                                    api.updateState("order", (order) => [...order, id]);
                                    api.setValue("nextId", id + 1);
                                    api.setValue("draft", "");
                                });
                                const input = event.target.querySelector("input");
                                if (input) input.value = "";
                            },
                            children: [
                                { input: { type: "text", placeholder: "Add a line", oninput: (event) => api.setValue("draft", event.target.value) } },
                                { button: { type: "submit", className: "primary", textContent: "Add" } },
                            ],
                        },
                    },
                    {
                        ul: {
                            className: "todos",
                            children: () => api.getState("order", []).map((id) => ({ Todo: { key: id, id } })),
                        },
                    },
                    { p: { className: "hint", textContent: "Checking a box writes items.<id>.done. The title binding reads items.<id>.title, so its count stays." } },
                ],
            },
        }));
        juris.render(el, { Todos: {} });
        return juris;
    });
}

export function mountCart(el) {
    return mount(el, () => {
        const juris = new Juris({
            state: {
                lines: [
                    { sku: "Milk", price: 3, qty: 1 },
                    { sku: "Eggs", price: 5, qty: 2 },
                ],
            },
        });
        juris.registerComponent("Cart", (props, api) => {
            api.compute("total", (api) => {
                const lines = api.getState("lines", []);
                return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
            });
            let totalRuns = 0;
            return {
                div: {
                    className: "stack",
                    children: [
                        {
                            ul: {
                                className: "cart",
                                children: [0, 1].map((index) => ({
                                    li: {
                                        className: "cart-line",
                                        children: [
                                            { span: { textContent: () => api.getState(`lines.${index}.sku`) } },
                                            { span: { className: "price", textContent: () => `${api.getState(`lines.${index}.price`)} €` } },
                                            {
                                                span: {
                                                    className: "qty",
                                                    textContent: () => `× ${api.getState(`lines.${index}.qty`)}`,
                                                },
                                            },
                                            {
                                                button: {
                                                    type: "button",
                                                    textContent: "+1",
                                                    onclick: () => api.updateState(`lines.${index}.qty`, (qty) => qty + 1),
                                                },
                                            },
                                        ],
                                    },
                                })),
                            },
                        },
                        {
                            p: {
                                className: "readout small",
                                textContent: () => {
                                    totalRuns += 1;
                                    return `${api.getState("total", 0)} €   ×${totalRuns}`;
                                },
                            },
                        },
                        { p: { className: "hint", textContent: "The total is compute(\"total\"). It re-runs when a qty it read changes. × counts those runs." } },
                    ],
                },
            };
        });
        juris.render(el, { Cart: {} });
        return juris;
    });
}

export function mountLikes(el) {
    return mount(el, () => {
        const juris = new Juris();
        juris.registerComponent("Like", (props, api) => {
            const [likes, setLikes] = api.useState("likes", 0);
            return {
                button: {
                    type: "button",
                    className: "like",
                    onclick: () => setLikes((n) => n + 1),
                    textContent: () => `${props.label}  ♥ ${likes()}`,
                },
            };
        });
        juris.render(el, {
            div: {
                className: "row",
                children: [
                    { Like: { label: "This essay" } },
                    { Like: { label: "The other one" } },
                ],
            },
        });
        return juris;
    });
}

export function mountMotion(el) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const juris = new Juris({ state: { t: 0, count: 36, run: !reduce } });
    let runs = 0;
    let raf = 0;
    let last = 0;
    let elapsed = 0;
    const colors = ["#f6efe4", "#e7b15a", "#ef7d5c", "#8fd0b3", "#d7c4a3"];
    const word = "reactivity";

    const frame = (now) => {
        elapsed += now - last;
        last = now;
        juris.setValue("t", elapsed / 1000);
        raf = requestAnimationFrame(frame);
    };
    const play = () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(frame);
    };
    const pause = () => {
        cancelAnimationFrame(raf);
        raf = 0;
    };

    juris.registerComponent("Stage", (props, api) => ({
        div: {
            className: "motion",
            children: [
                {
                    p: {
                        className: "wave",
                        children: word.split("").map((letter, index) => ({
                            span: {
                                className: "letter",
                                textContent: letter === " " ? "\u00a0" : letter,
                                style: () => {
                                    runs += 1;
                                    const t = api.getState("t", 0);
                                    const y = Math.sin(t * 3.1 + index * 0.48) * 18;
                                    return { transform: `translateY(${y.toFixed(2)}px)` };
                                },
                            },
                        })),
                    },
                },
                {
                    div: {
                        className: "orbit",
                        children: () => {
                            const count = api.getState("count", 36);
                            const discs = [];
                            for (let i = 0; i < count; i += 1) {
                                discs.push({
                                    span: {
                                        key: i,
                                        className: "disc",
                                        style: () => {
                                            runs += 1;
                                            const t = api.getState("t", 0);
                                            const speed = 0.45 + (i % 5) * 0.12;
                                            const angle = t * speed + i * 0.62;
                                            const radius = 34 + (i % 6) * 26;
                                            const x = Math.cos(angle) * radius;
                                            const y = Math.sin(angle * 1.13) * radius * 0.62;
                                            return {
                                                transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`,
                                                background: colors[i % colors.length],
                                            };
                                        },
                                    },
                                });
                            }
                            return discs;
                        },
                    },
                },
                {
                    p: {
                        className: "motion-stat",
                        textContent: () => {
                            const t = api.getState("t", 0);
                            return `${runs.toLocaleString("en-US")} binding runs   ·   t ${t.toFixed(2)}`;
                        },
                    },
                },
                {
                    div: {
                        className: "motion-controls",
                        children: [
                            {
                                button: {
                                    type: "button",
                                    className: "primary",
                                    textContent: () => (api.getState("run") ? "Pause" : "Play"),
                                    onclick: () => {
                                        const run = !api.getState("run");
                                        api.setValue("run", run);
                                        if (run) play();
                                        else pause();
                                    },
                                },
                            },
                            {
                                label: {
                                    className: "slider",
                                    children: [
                                        { span: { textContent: () => `${api.getState("count")} discs` } },
                                        {
                                            input: {
                                                type: "range",
                                                min: "8",
                                                max: "96",
                                                step: "4",
                                                value: () => String(api.getState("count")),
                                                oninput: (event) => api.setValue("count", Number(event.target.value)),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ],
        },
    }));
    juris.render(el, { Stage: {} });
    if (!reduce) play();
    return () => {
        pause();
        juris.disposeTree(el);
    };
}

export function mountName(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { name: "Ada" } });
        juris.registerComponent("Hello", (props, api) => ({
            div: {
                className: "stack",
                children: [
                    {
                        label: {
                            className: "field",
                            children: [
                                { span: { textContent: "Name" } },
                                { input: { type: "text", oninput: (event) => api.setValue("name", event.target.value) } },
                            ],
                        },
                    },
                    { p: { className: "readout small", textContent: () => `Hello, ${api.getState("name", "")}` } },
                ],
            },
        }));
        juris.render(el, { Hello: {} });
        const input = el.querySelector("input");
        if (input) input.value = "Ada";
        return juris;
    });
}

export function mountForm(el) {
    return mount(el, () => {
        const juris = new Juris();
        juris.use(forms());
        juris.registerComponent("SignIn", (props, api) => {
            const form = api.form("signin", {
                fields: { email: "", password: "" },
                validate: {
                    email: (value) => (value.includes("@") ? null : "Use an email address."),
                    password: (value) => (value.length >= 8 ? null : "At least 8 characters."),
                },
                submit(values) {
                    if (values.email.endsWith("@example.com")) fail("That domain is reserved.", { field: "email" });
                    return { name: values.email.split("@")[0] };
                },
                onSuccess: (result) => api.setValue("signedIn", result.name),
            });
            const field = (name, label, type) => ({
                label: {
                    className: "field",
                    children: [
                        { span: { textContent: label } },
                        { input: { ...form.field(name), type, autocomplete: "off" } },
                        { small: { className: "field-error", textContent: () => form.error(name) ?? "" } },
                    ],
                },
            });
            return () => {
                const name = api.getState("signedIn", "");
                if (name) {
                    return {
                        div: {
                            className: "stack",
                            children: [
                                { p: { className: "readout small", textContent: `Welcome, ${name}.` } },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Start over",
                                        onclick: () => {
                                            api.setValue("signedIn", "");
                                            form.reset();
                                        },
                                    },
                                },
                            ],
                        },
                    };
                }
                return {
                    form: {
                        ...form.props(),
                        className: "signin",
                        children: [
                            field("email", "Email", "email"),
                            field("password", "Password", "password"),
                            { p: { className: "field-error", textContent: () => api.getState("signin.error") ?? "" } },
                            {
                                button: {
                                    type: "submit",
                                    className: "primary",
                                    textContent: () => (api.getState("signin.submitting") ? "Checking…" : "Sign in"),
                                },
                            },
                        ],
                    },
                };
            };
        });
        juris.render(el, { SignIn: {} });
        return juris;
    });
}

export function mountFluent(el) {
    return mount(el, () => {
        const juris = new Juris({
            features: { headless: HeadlessManager },
            headlessComponents: {
                fluentState: { fn: createFluentStateHeadless, options: { autoInit: true } },
            },
        });
        const $ = juris.getHeadlessAPI("fluentState").getFluentStates();
        $.user.name = "Ada";
        $.user.city = "London";
        juris.registerComponent("Person", () => ({
            div: {
                className: "stack",
                children: [
                    {
                        label: {
                            className: "field",
                            children: [
                                { span: { textContent: "Name" } },
                                {
                                    input: {
                                        type: "text",
                                        value: () => $.user.name,
                                        oninput: (event) => { $.user.name = event.target.value; },
                                    },
                                },
                            ],
                        },
                    },
                    {
                        label: {
                            className: "field",
                            children: [
                                { span: { textContent: "City" } },
                                {
                                    input: {
                                        type: "text",
                                        value: () => $.user.city,
                                        oninput: (event) => { $.user.city = event.target.value; },
                                    },
                                },
                            ],
                        },
                    },
                    { p: { className: "readout small", textContent: () => `${$.user.name}, in ${$.user.city}` } },
                ],
            },
        }));
        juris.render(el, { Person: {} });
        return juris;
    });
}

export function mountLive(el) {
    return mount(el, () => {
        const juris = new Juris({
            state: {
                draft: "Hello, world",
                db: "Hello, world",
                last: "Hello, world",
                a: "Hello, world",
                b: "Hello, world",
                c: "",
                wire: "one run, full value, shared by A and B",
                log: [
                    "subscribe greeting [\"world\"] on page A",
                    "subscribe greeting [\"world\"] on page B",
                    "one run, full value, shared by both pages",
                ],
            },
        });
        const watching = (api) => (api.getState("c", "") ? 3 : 2);
        const push = (api, line) => api.updateState("log", (lines) => [...lines, line].slice(-7));
        juris.registerComponent("Model", (props, api) => ({
            div: {
                className: "live-model",
                children: [
                    {
                        section: {
                            className: "live-col",
                            children: [
                                { h3: { textContent: "Database" } },
                                { p: { className: "hint", textContent: "What greeting(\"world\") would read." } },
                                {
                                    input: {
                                        type: "text",
                                        value: () => api.getState("draft", ""),
                                        oninput: (event) => api.setValue("draft", event.target.value),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Commit rename",
                                        onclick: () => {
                                            const next = api.getState("draft", "");
                                            const prev = api.getState("last", "");
                                            api.setValue("db", next);
                                            push(api, "mutation rename  touches greeting");
                                            if (next === prev) {
                                                api.setValue("wire", "re-run, nothing changed, sent to nobody");
                                                push(api, "re-run greeting [\"world\"]  unchanged, sent nothing");
                                                return;
                                            }
                                            const pages = watching(api);
                                            api.batch(() => {
                                                api.setValue("last", next);
                                                api.setValue("a", next);
                                                api.setValue("b", next);
                                                if (api.getState("c", "")) api.setValue("c", next);
                                                api.setValue("wire", `{ text: "${next}" } → ${pages} pages`);
                                            });
                                            push(api, `diff { text }  →  ${pages} pages`);
                                        },
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Open page C",
                                        disabled: () => api.getState("c", "") !== "",
                                        onclick: () => {
                                            const value = api.getState("last", "");
                                            api.batch(() => {
                                                api.setValue("c", value);
                                                api.setValue("wire", "page C joined the last value, no new read");
                                            });
                                            push(api, "page C joined greeting [\"world\"] from the last value");
                                        },
                                    },
                                },
                            ],
                        },
                    },
                    {
                        section: {
                            className: "live-col stream",
                            children: [
                                { h3: { textContent: "On the wire" } },
                                { p: { className: "wire", textContent: () => api.getState("wire", "") } },
                                {
                                    ol: {
                                        className: "log",
                                        children: () => api.getState("log", []).map((line) => ({ li: { textContent: line } })),
                                    },
                                },
                            ],
                        },
                    },
                    {
                        section: {
                            className: "live-col pages",
                            children: [
                                { h3: { textContent: "Pages" } },
                                { p: { className: "page-card", textContent: () => `A  ${api.getState("a", "")}` } },
                                { p: { className: "page-card", textContent: () => `B  ${api.getState("b", "")}` } },
                                {
                                    p: {
                                        className: "page-card",
                                        textContent: () => (api.getState("c", "") ? `C  ${api.getState("c", "")}` : "C  not open"),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Model: {} });
        return juris;
    });
}
