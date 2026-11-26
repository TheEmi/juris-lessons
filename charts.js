import Juris from "./vendor/juris.js";

const INK = "#102028";
const SOFT = "#3d5562";
const RULE = "#0b5f70";
const LIVE = "#0d7a62";
const SIGNAL = "#1493a8";
const TRACK = "#d5e3ea";
const PAPER = "#f4fafb";

function mount(el, build) {
    const juris = build();
    return () => juris.disposeTree(el);
}

function readout(text) {
    return { p: { className: "chart-readout", textContent: text } };
}

function slider(api, path, label, min, max, step) {
    return {
        label: {
            className: "slider",
            children: [
                { span: { textContent: () => `${label} ${api.getState(path)}` } },
                {
                    input: {
                        type: "range",
                        min: String(min),
                        max: String(max),
                        step: String(step),
                        value: () => String(api.getState(path)),
                        oninput: (event) => api.setValue(path, Number(event.target.value)),
                    },
                },
            ],
        },
    };
}

// Two or three columns. `value` reads state. The tallest column is the scale.
function columnChart(api, series, plot) {
    const bottom = plot.y + plot.h;
    const slot = plot.w / series.length;
    const barW = Math.min(84, slot * 0.42);
    const heightOf = (item) => {
        const max = plot.scale ?? Math.max(1, ...series.map((seriesItem) => seriesItem.value()));
        const value = item.value();
        return value <= 0 ? 0 : Math.max(4, (value / max) * plot.h);
    };
    return {
        svg: {
            className: "chart-svg",
            viewBox: `0 0 ${plot.width} ${plot.height}`,
            role: "img",
            children: [
                {
                    line: {
                        x1: plot.x,
                        x2: plot.x + plot.w,
                        y1: bottom,
                        y2: bottom,
                        stroke: SOFT,
                        "stroke-opacity": "0.35",
                    },
                },
                ...series.map((item, index) => {
                    const cx = plot.x + slot * index + slot / 2;
                    return {
                        g: {
                            children: [
                                {
                                    rect: {
                                        x: cx - barW / 2,
                                        width: barW,
                                        rx: 8,
                                        fill: item.fill,
                                        y: () => bottom - heightOf(item),
                                        height: () => heightOf(item),
                                    },
                                },
                                {
                                    text: {
                                        x: cx,
                                        y: () => bottom - heightOf(item) - 10,
                                        "text-anchor": "middle",
                                        fill: INK,
                                        "font-size": "15",
                                        textContent: () => item.caption(),
                                    },
                                },
                                {
                                    text: {
                                        x: cx,
                                        y: bottom + 26,
                                        "text-anchor": "middle",
                                        fill: SOFT,
                                        "font-size": "13",
                                        textContent: item.label,
                                    },
                                },
                            ],
                        },
                    };
                }),
            ],
        },
    };
}

const REQUEST = [
    ["Spelling", "Any other path is a 301, before the page is read."],
    ["Viewer", "A signed-in page is private, and it is never stored for the next guest."],
    ["Route", "The guard can redirect. That happens before the cache is asked."],
    ["Before", "The first hook that names a location sends the request there."],
    ["Cache", "A guest may receive a copy. A stale copy is sent while one render replaces it."],
    ["Render", "The route’s preload runs, then one render, from the cache key."],
    ["Answer", "public, private, or no-store. A matching ETag is a 304. A 404 never is."],
];

export function mountRequestFlow(el) {
    let timer = 0;
    const stop = () => {
        clearInterval(timer);
        timer = 0;
    };
    const juris = new Juris({ state: { step: 0, play: false } });
    const finish = mount(el, () => {
        const play = (api) => {
            stop();
            api.setValue("play", true);
            timer = setInterval(() => {
                api.updateState("step", (step) => (step + 1) % REQUEST.length);
            }, 900);
        };
        const nodeW = 118;
        const gap = 22;
        const origin = 28;
        juris.registerComponent("Flow", (props, api) => ({
            div: {
                className: "chart-body",
                children: [
                    {
                        svg: {
                            className: "chart-svg",
                            viewBox: "0 0 1000 168",
                            role: "img",
                            children: [
                                {
                                    line: {
                                        x1: origin + nodeW / 2,
                                        x2: origin + (REQUEST.length - 1) * (nodeW + gap) + nodeW / 2,
                                        y1: 78,
                                        y2: 78,
                                        stroke: TRACK,
                                        "stroke-width": "4",
                                    },
                                },
                                ...REQUEST.map((node, index) => {
                                    const x = origin + index * (nodeW + gap);
                                    return {
                                        g: {
                                            onclick: () => {
                                                stop();
                                                api.setValue("play", false);
                                                api.setValue("step", index);
                                            },
                                            style: { cursor: "pointer" },
                                            children: [
                                                {
                                                    rect: {
                                                        x,
                                                        y: 46,
                                                        width: nodeW,
                                                        height: 64,
                                                        rx: 12,
                                                        fill: () => (api.getState("step") === index ? RULE : PAPER),
                                                        stroke: () => (api.getState("step") === index ? RULE : TRACK),
                                                        "stroke-width": "2",
                                                    },
                                                },
                                                {
                                                    text: {
                                                        x: x + nodeW / 2,
                                                        y: 84,
                                                        "text-anchor": "middle",
                                                        fill: () => (api.getState("step") === index ? PAPER : INK),
                                                        "font-size": "14",
                                                        textContent: node[0],
                                                    },
                                                },
                                            ],
                                        },
                                    };
                                }),
                                {
                                    circle: {
                                        r: 8,
                                        cy: 28,
                                        fill: LIVE,
                                        cx: () => origin + api.getState("step") * (nodeW + gap) + nodeW / 2,
                                    },
                                },
                            ],
                        },
                    },
                    readout(() => {
                        const step = api.getState("step", 0);
                        return `${step + 1} of ${REQUEST.length}  ·  ${REQUEST[step][1]}`;
                    }),
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: () => (api.getState("play") ? "Pause" : "Send a request"),
                                        onclick: () => {
                                            if (api.getState("play")) {
                                                stop();
                                                api.setValue("play", false);
                                            } else play(api);
                                        },
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Next step",
                                        onclick: () => {
                                            stop();
                                            api.setValue("play", false);
                                            api.updateState("step", (step) => (step + 1) % REQUEST.length);
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Flow: {} });
        return juris;
    });
    return () => {
        stop();
        finish();
    };
}

const BINDINGS = 6;

export function mountPasses(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { writes: 1 } });
        juris.registerComponent("Passes", (props, api) => {
            const server = () => BINDINGS;
            const client = () => BINDINGS * api.getState("writes", 1);
            return {
                div: {
                    className: "chart-body",
                    children: [
                        columnChart(api, [
                            { label: "Server, one pass", fill: RULE, value: server, caption: () => String(server()) },
                            { label: "Browser, still subscribed", fill: SIGNAL, value: client, caption: () => String(client()) },
                        ], { width: 720, height: 280, x: 40, y: 36, w: 640, h: 180, scale: BINDINGS * 12 }),
                        readout(() => {
                            const writes = api.getState("writes", 1);
                            return `${BINDINGS} bindings. The server evaluated each one once. After ${writes} write${writes === 1 ? "" : "s"}, the browser has run them ${BINDINGS * writes} times.`;
                        }),
                        {
                            div: {
                                className: "row",
                                children: [
                                    {
                                        button: {
                                            type: "button",
                                            className: "primary",
                                            textContent: "Another state write",
                                            onclick: () => api.updateState("writes", (n) => Math.min(n + 1, 12)),
                                        },
                                    },
                                    {
                                        button: {
                                            type: "button",
                                            textContent: "Back to the first paint",
                                            onclick: () => api.setValue("writes", 1),
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            };
        });
        juris.render(el, { Passes: {} });
        return juris;
    });
}

const BOOT = [
    "Parse #state",
    "Build the instance",
    "Install plugins",
    "Register components",
    "Skew guard",
    "Load the route",
    "beforeMount",
    "Mount into #app",
    "Bind the title",
    "Prefetch routes",
    "Service worker",
];

export function mountHydrateChart(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { step: 0 } });
        juris.registerComponent("Boot", (props, api) => ({
            div: {
                className: "chart-body",
                children: [
                    {
                        svg: {
                            className: "chart-svg",
                            viewBox: "0 0 1000 210",
                            role: "img",
                            children: [
                                {
                                    text: { x: 28, y: 28, fill: SOFT, "font-size": "13", textContent: "Boot" },
                                },
                                ...BOOT.map((label, index) => {
                                    const slot = 86;
                                    const x = 28 + index * slot;
                                    return {
                                        g: {
                                            onclick: () => api.setValue("step", index),
                                            style: { cursor: "pointer" },
                                            children: [
                                                {
                                                    rect: {
                                                        x,
                                                        y: () => (api.getState("step") >= index ? 78 : 108),
                                                        width: 70,
                                                        height: () => (api.getState("step") >= index ? 70 : 40),
                                                        rx: 8,
                                                        fill: () => (index === 7 && api.getState("step") >= 7 ? LIVE : api.getState("step") >= index ? RULE : TRACK),
                                                    },
                                                },
                                                {
                                                    text: {
                                                        x: x + 35,
                                                        y: 176,
                                                        "text-anchor": "middle",
                                                        fill: SOFT,
                                                        "font-size": "11",
                                                        textContent: String(index + 1),
                                                    },
                                                },
                                            ],
                                        },
                                    };
                                }),
                                {
                                    text: { x: 28, y: 204, fill: INK, "font-size": "14", textContent: () => BOOT[api.getState("step", 0)] },
                                },
                            ],
                        },
                    },
                    readout(() => {
                        const step = api.getState("step", 0);
                        const page = step >= 7 ? "The page is interactive." : "The server HTML is what is on screen.";
                        const idle = step >= 9 ? " Other routes load once the browser is idle." : "";
                        return `Step ${step + 1} of ${BOOT.length}: ${BOOT[step]}. ${page}${idle}`;
                    }),
                    {
                        label: {
                            className: "slider",
                            children: [
                                { span: { textContent: () => `Step ${api.getState("step", 0) + 1} of ${BOOT.length}` } },
                                {
                                    input: {
                                        type: "range",
                                        min: "0",
                                        max: String(BOOT.length - 1),
                                        step: "1",
                                        value: () => String(api.getState("step", 0)),
                                        oninput: (event) => api.setValue("step", Number(event.target.value)),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }));
        juris.render(el, { Boot: {} });
        return juris;
    });
}

const LEAF = 32;
const DOCUMENT_FIELDS = 8;

export function mountFanout(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { pages: 24, changed: 2 } });
        juris.registerComponent("Fanout", (props, api) => {
            const diffBytes = () => api.getState("pages", 1) * api.getState("changed", 0) * LEAF;
            const fullBytes = () => api.getState("pages", 1) * DOCUMENT_FIELDS * LEAF;
            const messages = () => (api.getState("changed", 0) === 0 ? 0 : api.getState("pages", 1));
            const kb = (bytes) => (bytes >= 1000 ? `${(bytes / 1000).toFixed(1)} KB` : `${bytes} B`);
            return {
                div: {
                    className: "chart-body",
                    children: [
                        columnChart(api, [
                            { label: "Changed leaves", fill: LIVE, value: diffBytes, caption: () => kb(diffBytes()) },
                            { label: "Whole value, every page", fill: "#8aa4b0", value: fullBytes, caption: () => kb(fullBytes()) },
                        ], { width: 860, height: 300, x: 48, y: 28, w: 760, h: 190, scale: 80 * DOCUMENT_FIELDS * LEAF }),
                        readout(() => {
                            const pages = api.getState("pages", 1);
                            const changed = api.getState("changed", 0);
                            if (changed === 0) {
                                return `${pages} pages watch one query. The re-run changed nothing, so the server sends no message. Illustrated size of a full value: ${fullBytes()} bytes.`;
                            }
                            return `${pages} pages, 1 database read, ${messages()} diffs. Illustrated payload ${diffBytes()} bytes against ${fullBytes()} bytes if each page were sent all ${DOCUMENT_FIELDS} fields.`;
                        }),
                        {
                            div: {
                                className: "chart-controls",
                                children: [
                                    slider(api, "pages", "Pages", 1, 80, 1),
                                    slider(api, "changed", "Fields that changed", 0, DOCUMENT_FIELDS, 1),
                                ],
                            },
                        },
                    ],
                },
            };
        });
        juris.render(el, { Fanout: {} });
        return juris;
    });
}

const BUS = [
    ["Instance A", "The mutation commits here. Its touches name the queries to wake."],
    ["Outbox", "The row is the record. A notification alone would vanish if nobody was listening."],
    ["Doorbell", "Postgres wakes listeners with NOTIFY. MariaDB and MySQL wait for the next poll."],
    ["Instance B", "It reads the row and applies the targets. It does not publish them again."],
    ["Its pages", "Subscribers on this instance get the same diff. Pages on A already have it."],
];

export function mountBus(el) {
    return mount(el, () => {
        const juris = new Juris({ state: { hop: 0, poll: 1000 } });
        const nodeW = 150;
        const gap = 28;
        const origin = 36;
        juris.registerComponent("Bus", (props, api) => ({
            div: {
                className: "chart-body",
                children: [
                    {
                        svg: {
                            className: "chart-svg",
                            viewBox: "0 0 960 150",
                            role: "img",
                            children: [
                                {
                                    line: {
                                        x1: origin + nodeW / 2,
                                        x2: origin + (BUS.length - 1) * (nodeW + gap) + nodeW / 2,
                                        y1: 70,
                                        y2: 70,
                                        stroke: TRACK,
                                        "stroke-width": "4",
                                    },
                                },
                                ...BUS.map((node, index) => {
                                    const x = origin + index * (nodeW + gap);
                                    return {
                                        g: {
                                            onclick: () => api.setValue("hop", index),
                                            style: { cursor: "pointer" },
                                            children: [
                                                {
                                                    rect: {
                                                        x,
                                                        y: 38,
                                                        width: nodeW,
                                                        height: 64,
                                                        rx: 12,
                                                        fill: () => (api.getState("hop") === index ? RULE : api.getState("hop") > index ? "#d7efe8" : PAPER),
                                                        stroke: () => (api.getState("hop") >= index ? LIVE : TRACK),
                                                        "stroke-width": "2",
                                                    },
                                                },
                                                {
                                                    text: {
                                                        x: x + nodeW / 2,
                                                        y: 76,
                                                        "text-anchor": "middle",
                                                        fill: () => (api.getState("hop") === index ? PAPER : INK),
                                                        "font-size": "15",
                                                        textContent: node[0],
                                                    },
                                                },
                                            ],
                                        },
                                    };
                                }),
                            ],
                        },
                    },
                    readout(() => BUS[api.getState("hop", 0)][1]),
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Advance the write",
                                        onclick: () => api.updateState("hop", (hop) => (hop + 1) % BUS.length),
                                    },
                                },
                            ],
                        },
                    },
                    columnChart(api, [
                        { label: "Postgres NOTIFY", fill: LIVE, value: () => 20, caption: () => "wake" },
                        { label: "MariaDB poll", fill: SIGNAL, value: () => api.getState("poll", 1000), caption: () => `${api.getState("poll", 1000)} ms` },
                    ], { width: 720, height: 250, x: 40, y: 24, w: 640, h: 150 }),
                    readout(() => `The other instance hears a Postgres doorbell at once. On MariaDB it waits for the poll, up to ${api.getState("poll", 1000)} ms. The outbox is what both of them read.`),
                    slider(api, "poll", "Poll every", 250, 4000, 250),
                ],
            },
        }));
        juris.render(el, { Bus: {} });
        return juris;
    });
}
