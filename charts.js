import Juris from "./vendor/juris.js";

function mount(el, build) {
    const juris = build();
    return () => juris.disposeTree(el);
}

function choice(api, path, id, label) {
    return {
        button: {
            type: "button",
            className: "choice",
            classList: { on: () => api.getState(path) === id },
            textContent: label,
            onclick: () => api.setValue(path, id),
        },
    };
}

const PIPE = ["Method", "Spelling", "Viewer", "Route", "Before", "Cache", "Render", "Answer"];

// Each cell is what that stage did with this request. "skip" is a stage the request did not run.
const REQUESTS = {
    spell: {
        status: "301",
        detail: "Location: /cart",
        cells: [
            ["GET continues", "on"],
            ["301 to /cart", "on"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
        ],
    },
    guest: {
        status: "200",
        detail: "public · the body is the cached “2 items”",
        cells: [
            ["GET continues", "on"],
            ["/cart", "on"],
            ["guest", "on"],
            ["cart", "on"],
            ["no redirect", "on"],
            ["hit · 2 items", "on"],
            ["not run", "skip"],
            ["200 public", "on"],
        ],
    },
    ada: {
        status: "200",
        detail: "private · rendered for Ada, and not stored",
        cells: [
            ["GET continues", "on"],
            ["/cart", "on"],
            ["Ada · personal", "on"],
            ["cart", "on"],
            ["no redirect", "on"],
            ["skipped", "skip"],
            ["Ada · 2 items", "on"],
            ["200 private", "on"],
        ],
    },
    missing: {
        status: "404",
        detail: "If-None-Match was sent. The status stays 404, and the page is not stored.",
        cells: [
            ["GET continues", "on"],
            ["/missing", "on"],
            ["guest", "on"],
            ["no page", "on"],
            ["no redirect", "on"],
            ["not stored", "skip"],
            ["not found", "on"],
            ["404", "on"],
        ],
    },
    post: {
        status: "405",
        detail: "Allow: GET, HEAD",
        cells: [
            ["405", "on"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
            ["not reached", "skip"],
        ],
    },
};

export function mountRequestFlow(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { which: "guest" } });
        juris.registerComponent("Trace", (props, api) => {
            const current = () => REQUESTS[api.getState("which", "guest")];
            return {
                div: {
                    className: "flow",
                    children: [
                        {
                            div: {
                                className: "row",
                                children: [
                                    choice(api, "which", "spell", "GET /Cart"),
                                    choice(api, "which", "guest", "GET /cart · guest"),
                                    choice(api, "which", "ada", "GET /cart · Ada"),
                                    choice(api, "which", "missing", "GET /missing"),
                                    choice(api, "which", "post", "POST /cart"),
                                ],
                            },
                        },
                        {
                            div: {
                                className: "flow-board pipeline",
                                children: PIPE.map((name, index) => ({
                                    div: {
                                        className: "station",
                                        classList: {
                                            on: () => current().cells[index][1] === "on",
                                            skip: () => current().cells[index][1] === "skip",
                                        },
                                        children: [
                                            { p: { className: "k", textContent: name } },
                                            { p: { className: "v", textContent: () => current().cells[index][0] } },
                                        ],
                                    },
                                })),
                            },
                        },
                        {
                            p: {
                                className: "flow-result",
                                textContent: () => `${current().status} · ${current().detail}`,
                            },
                        },
                    ],
                },
            };
        });
        juris.render(el, { Trace: {} });
        return juris;
    });
}

export function mountPasses(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { live: false, count: 2, runs: 1 } });
        juris.registerComponent("Passes", (props, api) => ({
            div: {
                className: "flow",
                children: [
                    {
                        div: {
                            className: "pair",
                            children: [
                                {
                                    section: {
                                        className: "station on",
                                        children: [
                                            { p: { className: "k", textContent: "Already sent" } },
                                            { p: { className: "v doc", textContent: "Cart" } },
                                            { p: { className: "v doc", textContent: "2" } },
                                            { p: { className: "k", textContent: '#state {"cart":{"count":2}}' } },
                                            { p: { className: "v", textContent: "title ×1 · count ×1" } },
                                        ],
                                    },
                                },
                                {
                                    section: {
                                        className: "station",
                                        classList: { on: () => api.getState("live") === true },
                                        children: [
                                            { p: { className: "k", textContent: () => (api.getState("live") ? "Browser, subscribed" : "Server HTML, still on screen") } },
                                            { p: { className: "v doc", textContent: "Cart" } },
                                            { p: { className: "v doc", textContent: () => String(api.getState("count", 2)) } },
                                            { p: { className: "v", textContent: () => `title ×1 · count ×${api.getState("runs", 1)}` } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Take over the page",
                                        disabled: () => api.getState("live") === true,
                                        onclick: () => api.setValue("live", true),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Add one",
                                        disabled: () => api.getState("live") !== true,
                                        onclick: () => api.batch(() => {
                                            api.updateState("count", (n) => n + 1);
                                            api.updateState("runs", (n) => n + 1);
                                        }),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Passes: {} });
        return juris;
    });
}

export function mountHydrateChart(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { skew: false, taken: false, count: 2 } });
        juris.registerComponent("Boot", (props, api) => {
            const ready = () => api.getState("taken") === true && api.getState("skew") !== true;
            return {
                div: {
                    className: "flow",
                    children: [
                        {
                            div: {
                                className: "flow-board tags",
                                children: [
                                    {
                                        div: {
                                            className: "station on",
                                            children: [
                                                { p: { className: "k", textContent: "#app" } },
                                                { p: { className: "v", textContent: () => (ready() ? "replaced by the client" : "server markup") } },
                                            ],
                                        },
                                    },
                                    {
                                        div: {
                                            className: "station on",
                                            children: [
                                                { p: { className: "k", textContent: "#state" } },
                                                { p: { className: "v", textContent: () => (ready() ? "adopted · cart.count 2" : '{"cart":{"count":2}}') } },
                                            ],
                                        },
                                    },
                                    {
                                        div: {
                                            className: "station",
                                            classList: { skip: () => api.getState("skew") === true, on: () => api.getState("skew") !== true },
                                            children: [
                                                { p: { className: "k", textContent: "Route name" } },
                                                { p: { className: "v", textContent: () => (api.getState("skew") ? "document says basket, this build says cart" : "cart on both sides") } },
                                            ],
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            div: {
                                className: "page-card flow-page",
                                children: [
                                    { span: { textContent: () => `Cart · ${ready() ? api.getState("count", 2) : 2}` } },
                                    {
                                        button: {
                                            type: "button",
                                            textContent: "Add one",
                                            disabled: () => !ready(),
                                            onclick: () => api.updateState("count", (n) => n + 1),
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            div: {
                                className: "row",
                                children: [
                                    {
                                        button: {
                                            type: "button",
                                            className: "primary",
                                            textContent: "Take over the page",
                                            disabled: () => api.getState("skew") === true || api.getState("taken") === true,
                                            onclick: () => api.setValue("taken", true),
                                        },
                                    },
                                    {
                                        button: {
                                            type: "button",
                                            textContent: "Previous build",
                                            onclick: () => api.batch(() => {
                                                api.setValue("skew", true);
                                                api.setValue("taken", false);
                                                api.setValue("count", 2);
                                            }),
                                        },
                                    },
                                    {
                                        button: {
                                            type: "button",
                                            textContent: "Reload once",
                                            disabled: () => api.getState("skew") !== true,
                                            onclick: () => api.batch(() => {
                                                api.setValue("skew", false);
                                                api.setValue("taken", true);
                                                api.setValue("count", 2);
                                            }),
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            };
        });
        juris.render(el, { Boot: {} });
        return juris;
    });
}

export function mountBus(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { engine: "pg", a: "Milk", b: "Milk", outbox: 0, waiting: false } });
        const reset = (api, engine) => api.batch(() => {
            api.setValue("engine", engine);
            api.setValue("a", "Milk");
            api.setValue("b", "Milk");
            api.setValue("outbox", 0);
            api.setValue("waiting", false);
        });
        juris.registerComponent("Bus", (props, api) => ({
            div: {
                className: "flow",
                children: [
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "choice",
                                        classList: { on: () => api.getState("engine") === "pg" },
                                        textContent: "Postgres",
                                        disabled: () => api.getState("a") === "Eggs" || api.getState("waiting") === true,
                                        onclick: () => api.setValue("engine", "pg"),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        className: "choice",
                                        classList: { on: () => api.getState("engine") === "mysql" },
                                        textContent: "MariaDB",
                                        disabled: () => api.getState("a") === "Eggs" || api.getState("waiting") === true,
                                        onclick: () => api.setValue("engine", "mysql"),
                                    },
                                },
                            ],
                        },
                    },
                    {
                        div: {
                            className: "flow-board thirds",
                            children: [
                                {
                                    div: {
                                        className: "station on",
                                        children: [
                                            { p: { className: "k", textContent: "Instance A · its pages" } },
                                            { p: { className: "v doc", textContent: () => api.getState("a", "Milk") } },
                                        ],
                                    },
                                },
                                {
                                    div: {
                                        className: "station",
                                        classList: { on: () => api.getState("outbox", 0) > 0 },
                                        children: [
                                            { p: { className: "k", textContent: "Outbox" } },
                                            { p: { className: "v", textContent: () => (api.getState("outbox", 0) === 0 ? "empty" : "1 row · todos") } },
                                        ],
                                    },
                                },
                                {
                                    div: {
                                        className: "station",
                                        classList: {
                                            on: () => api.getState("b") === "Eggs",
                                            skip: () => api.getState("waiting") === true,
                                        },
                                        children: [
                                            { p: { className: "k", textContent: "Instance B · its pages" } },
                                            { p: { className: "v doc", textContent: () => api.getState("b", "Milk") } },
                                            { p: { className: "v", textContent: () => (api.getState("waiting") ? "stale until the next poll" : api.getState("b") === "Eggs" ? "read the row · wrote none" : "in sync") } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Commit Eggs on A",
                                        disabled: () => api.getState("a") === "Eggs",
                                        onclick: () => api.batch(() => {
                                            api.setValue("a", "Eggs");
                                            api.setValue("outbox", 1);
                                            if (api.getState("engine") === "pg") {
                                                api.setValue("b", "Eggs");
                                                api.setValue("waiting", false);
                                            } else {
                                                api.setValue("waiting", true);
                                            }
                                        }),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Poll",
                                        disabled: () => api.getState("waiting") !== true,
                                        onclick: () => api.batch(() => {
                                            api.setValue("b", "Eggs");
                                            api.setValue("waiting", false);
                                        }),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Reset",
                                        onclick: () => reset(api, api.getState("engine", "pg")),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Bus: {} });
        return juris;
    });
}
