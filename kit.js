import { open, lede, prose, rich, code, note, pull, table, h2 } from "./ui.js";
import { mountLive } from "./demos.js";
import { mountRequestFlow, mountPasses, mountHydrateChart, mountFanout, mountBus } from "./charts.js";

const stage = (onStart, caption) => ({ DemoFrame: { onStart, caption } });

const FILES = [
    ["app", "client/app.js", `export const routes = [
    { path: "/", name: "home", component: "Home", preload: () => [["greeting", "world"]], head: { title: "Hello" } },
    { path: "*", name: "missing", component: "NotFound", head: { title: "Not found" } },
];
export const title = { suffix: " · Hello", fallback: "Hello" };

export function register(juris) {
    juris.registerComponent("App", () => ({ main: { children: [{ RouterView: {} }] } }));
    juris.registerComponent("Home", (props, api) => {
        api.live("greeting", "greeting", "world");
        return { h1: { textContent: () => api.getState("greeting")?.text ?? "" } };
    });
    juris.registerComponent("NotFound", () => ({ p: { textContent: "Nothing here." } }));
}`],
    ["boot", "client/boot.js", `import { hydrate } from "/src/client.js";
import { routes, register, title } from "./app.js";

export const start = () => hydrate({ routes, register, title });`],
    ["services", "services.js", `import { fail } from "juris/errors.js";

export const services = {
    async greeting(name) {
        if (typeof name !== "string" || !name.trim()) {
            fail("Say who to greet.", { fields: { name: "Required." } });
        }
        return { text: \`Hello, \${name.trim().slice(0, 60)}\` };
    },
};`],
    ["appmjs", "app.mjs", `import { createJurisServer } from "juris-kit/server/kernel.js";
import { routes, register, title } from "./client/app.js";

export function createApp({ services, dev = false, build = "dev" }) {
    return createJurisServer({
        root: new URL(".", import.meta.url),
        dev,
        build,
        services,
        routes,
        setup: register,
        api: { live: { public: true, queries: ["greeting"], touches: {} } },
        modules: { mounts: [{ url: "/client/", dir: "client" }], entry: "/client/boot.js" },
        page: { title },
    });
}`],
    ["server", "server.mjs", `import { createApp } from "./app.mjs";
import { services } from "./services.js";

const app = await createApp({ services, dev: !process.env.PROD, build: process.env.BUILD });
const { url } = await app.listen({ port: Number(process.env.PORT ?? 3000) });
console.log(\`listening on \${url}\`);

async function stop() {
    await app.close();
    process.exit(0);
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);`],
];

const ATLAS = [
    {
        id: "kernel",
        path: "server/kernel.js",
        role: "The server an app calls",
        body: "createJurisServer is the function in app.mjs. It builds one Juris instance for every request, installs the router, loads every route’s code, and wires the page pipeline to the service dispatcher and the module server. It also exports the two pieces it is made of: createPagePipeline, which answers a page request in a fixed order, and createLifecycle, which answers /healthz and runs jobs. The server’s instance is given the string renderer. devMode stays off on that instance. Development pages carry #juris-dev, and the browser turns dev mode on from that.",
    },
    {
        id: "ssr",
        path: "server/ssr-renderer.js",
        role: "Layouts, as a string",
        body: "SSRRenderer is a feature: new Juris({ isServer: true, features: { ssr: SSRRenderer } }). The kit’s server passes it for you. Every reactive function is evaluated once, untracked. There is no subscription, no proxy kept alive, no listener. The only per-render state is the list of component instances, and their cleanups run when the render ends. The same rules as the DOM renderer decide tags, attributes, URLs and escaping, so the markup the browser parses is the markup the client would have drawn.",
    },
    {
        id: "document",
        path: "server/document.js",
        role: "The HTML document",
        body: "renderDocument writes the doctype, the head the app described as data, the rendered body in #app, the state in #state, the service names in #services, and the loader that imports the entry and calls start() once the page is idle. Values are escaped. trustedHead is the one slot written as given, for an inline script the app itself authored, never for anything a request carried. A title made from a user’s record is text. A URL scheme that would run code is refused.",
    },
    {
        id: "http",
        path: "server/http.js",
        role: "Cookies, bodies, conditional responses",
        body: "The pieces every server needs and the framework keeps in one place: parseCookies, the client address, reading a body, refusing a method with the Allow header RFC 9110 asks for, and sending a response from memory or from disk. Conditional requests are read the way the RFC reads them, which is how a page answers 304. Nothing here reads the environment. Whether a proxy stands in front, and whether the site is on HTTPS, is passed in by the app.",
    },
    {
        id: "dispatcher",
        path: "server/service-dispatcher.js",
        role: "Services and live queries",
        body: "serviceDispatcher(services, base, options) answers POST /api/<name> by running the service and returning JSON. The browser half is juris/remote-services.js. The call key and the diff are juris/live-protocol.js, shared so both ends compute the same key. Live queries use one Server-Sent Events stream at /api/events per instance, and subscriptions go through POST /api/_live. Subscribers are grouped by name and arguments, so a query watched by many pages runs once per invalidation. Only changed leaves are sent. An unchanged re-run sends nothing.",
    },
    {
        id: "modules",
        path: "server/modules.js",
        role: "The files, served as they are",
        body: "createModuleServer serves the browser modules with no build. Mounts declare URL prefix, directory, depth and extensions. Names are plain, so a URL cannot walk out of its directory. The juris package is always mounted flat at /src/. The kit’s server/ is never served, and a mount that reaches the framework is refused. In production, imports are stamped with the build id so a rolling deploy does not mix two builds in one page. rootFiles are the fixed names a browser asks for again, such as a service worker. static is fonts, pictures, a vendored library.",
    },
    {
        id: "cache",
        path: "server/page-cache.js",
        role: "Which pages can be kept",
        body: "The renderer can report what a render depended on. This module turns that report into a decision: static pages are cached and never expire, dependent pages drop when a service they used is invalidated, volatile, incomplete, failed and personal pages are never cached. A known change drops the page. A TTL serves the stale page and regenerates one copy in the background. A snapshot of service versions is taken before the render, and put refuses a page whose services moved while it was drawing, so a finished render cannot store data a change already replaced.",
    },
    {
        id: "minify",
        path: "server/minify.js",
        role: "Whitespace, in production",
        body: "A conservative minifier for the JS and CSS the server sends, production only. Development sends the source, so a stack trace points at a real line. It removes comments, indentation and blank lines, and collapses insignificant whitespace to one character. It never joins lines, never deletes the space between tokens, and never looks inside a string, a template or a regular expression. It does not rename anything. The guarantee is that the code means what it meant.",
    },
    {
        id: "reload",
        path: "server/dev-reload.js",
        role: "Restart the process, reload the page",
        body: "devReload watches the app. A change to code the server runs calls onRestart, which the app supplies, because the framework never starts a process itself. Node has no honest way to re-import a module, so the reload is a new process. A change to a file only the browser loads tells the open pages to reload, through a small client renderDocument writes at the end of the body, and the stream is /__reload. It is refused outside development.",
    },
    {
        id: "process",
        path: "server/process.js",
        role: "One process, or a primary that only forks",
        body: "startProcess is what server.mjs calls before it opens a pool or starts a job. It returns \"serve\" when this process should listen, and \"primary\" when it forked workers and serves nothing. Several workers on one port are refused while the app has live queries: the event stream and the subscribe call are different connections, Node’s cluster hands each to whichever worker is next, and the registry of streams lives in one process. The subscribe would land on a worker that never minted that client and answer 403. Several instances belong behind a balancer that pins a client to one of them.",
    },
    {
        id: "db",
        path: "server/db.js",
        role: "One interface, the app’s driver",
        body: "fromPg, fromMysql2 and fromMariadb adapt a pool the app created. query(sql, params) returns the rows. transaction(fn) runs on one connection between BEGIN and COMMIT, and rolls back if fn throws. Rows of a statement that returns rows also carry rows.fields, the column names, non-enumerable so they survive JSON. The module imports no driver. The kit’s dependency list is juris and nothing else.",
    },
    {
        id: "pg",
        path: "server/bus/pg-outbox.js",
        role: "Postgres, with NOTIFY as a doorbell",
        body: "A change bus so more than one instance hears an invalidation. The outbox table is the source of truth. NOTIFY wakes a listener, which then reads the table. A notification alone would drop anything published while an instance was restarting, so a slow sweep runs anyway. schemaFor creates the table and the trigger. prune deletes old rows. The table is not a history.",
    },
    {
        id: "mysql",
        path: "server/bus/mysql-outbox.js",
        role: "MariaDB and MySQL, by polling",
        body: "The same bus on a database without LISTEN/NOTIFY. A feeder polls on an interval, and the latency of a change is that interval. The outbox, the targets and the contract the dispatcher sees are the ones the Postgres bus has. An app picks the bus for the database it already runs.",
    },
];

const REQUEST = [
    { title: "One spelling of the path", body: "canonicalPath runs before anything reads the URL. Any other spelling is a 301 to the canonical one. A cache key and a render later see a single path." },
    { title: "Who is asking", body: "The app’s viewer(req, url) returns the person, or null for a guest. A viewer’s page is personal: it is never kept, never served from the guest cache, and it is sent private." },
    { title: "The route", body: "The router’s resolve names the route, with the viewer as context. A redirect the guard or the route table returns is a 302, sent before the cache is asked, so a copy kept for guests is never served past a guard." },
    { title: "The before hooks", body: "page.before runs in order. The first hook that returns a location redirects. This is the app’s place for a check the route table does not express." },
    { title: "The page cache", body: "Guests only, and not for a request the app’s personal hook says is theirs alone. A hit is sent. A stale hit is sent while one render replaces it. createJurisServer itself keeps no cache: a cache has to be fed by the dispatcher’s invalidations, so you build that dispatcher and pass it as api." },
    { title: "The render", body: "The route’s preload runs, then one renderRequest. A page the cache may keep is rendered from its cache key, which holds only the query parameters pages declared, so the first visitor’s other parameters never ride along in the state." },
    { title: "The answer", body: "public for a guest, private for a viewer or a personal request, no-store in development. A GET or HEAD that already holds the page’s ETag gets a 304. A 404 never does. Methods other than GET and HEAD never reach a page." },
];

const HYDRATE = [
    { title: "Parse #state", body: "The JSON in the script tag is the state the server rendered with, private roots already removed, < escaped so the tag cannot be closed early." },
    { title: "Build the instance", body: "The browser constructs Juris with that state, stubs for the services a page may call, and the components the server was given. In dev mode, and only then, it imports devtools.js." },
    { title: "Install plugins", body: "The router, then the live client, then the app’s plugins, in the order given. The server installed them in that order too. An api name is taken once." },
    { title: "Register components", body: "register(juris) defines the same components the server’s setup defined. A component reaches Juris through its api and imports nothing of it." },
    { title: "The skew guard", body: "If this build’s route table names the page differently from the server that drew it, the browser reloads once before drawing. A cached page can boot the next build. The guard remembers the reload in sessionStorage, under a key the app names." },
    { title: "The route’s own code", body: "Every matched record’s load() is awaited. That is how a page’s module arrives before anything unregistered is drawn." },
    { title: "beforeMount", body: "The app’s hook runs, and may return a promise. This is where a preference the server could not know is written, before the first render reads it." },
    { title: "Mount", body: "The root layout, { App: {} } unless you said otherwise, is drawn into #app, replacing the server’s markup. Preloaded calls are released, and later calls go to the network." },
    { title: "The title", body: "document.title is bound with the same title options the server used, so a page named from its data keeps that name." },
    { title: "Prefetch", body: "Once the browser is idle, every other route’s code is loaded, and the first navigation is instant. prefetch: false waits until the route is visited." },
    { title: "The service worker", body: "If hydrate was given a serviceWorker script, it is registered when idle, and its messages are handed to the app. Then, if you asked, the instance is exposed on a global name a test can wait for." },
];

export function registerKitLessons(juris) {
    juris.registerComponent("Stepper", (props, api) => {
        const [step, setStep] = api.useState(props.name, 0);
        const steps = props.steps;
        const last = steps.length - 1;
        return {
            div: {
                className: "stepper",
                children: [
                    {
                        ol: {
                            children: steps.map((item, index) => ({
                                li: {
                                    children: [{
                                        button: {
                                            type: "button",
                                            className: "step-btn",
                                            classList: { on: () => step() === index },
                                            onclick: () => setStep(index),
                                            children: [
                                                { span: { className: "step-i", textContent: String(index + 1).padStart(2, "0") } },
                                                { span: { textContent: item.title } },
                                            ],
                                        },
                                    }],
                                },
                            })),
                        },
                    },
                    {
                        div: {
                            className: "step-body",
                            children: () => {
                                const item = steps[step()];
                                return [
                                    { h2: { textContent: item.title } },
                                    { p: { textContent: item.body } },
                                ];
                            },
                        },
                    },
                    {
                        div: {
                            className: "row",
                            children: [
                                {
                                    button: {
                                        type: "button",
                                        textContent: "Previous",
                                        disabled: () => step() === 0,
                                        onclick: () => setStep((n) => Math.max(0, n - 1)),
                                    },
                                },
                                {
                                    button: {
                                        type: "button",
                                        className: "primary",
                                        textContent: "Next",
                                        disabled: () => step() === last,
                                        onclick: () => setStep((n) => Math.min(last, n + 1)),
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        };
    });

    juris.registerComponent("LessonSplit", () => open("split", "The browser package, and the Node package.", [
        lede("juris is the half a browser downloads. juris-kit depends on it, serves it at /src/, and adds the server. Rendering to a string is the kit’s on purpose: the string renderer is not in the import graph of juris.js, so a page never downloads it."),
        table(
            ["Where", "Import", "For"],
            [
                ["Browser entry", "/src/client.js", "hydrate, the whole boot"],
                ["Shared modules", "/src/forms.js, router.js, live-data.js, clock.js, errors.js, storage.js", "Plugins and helpers, in the browser"],
                ["Services", "juris/errors.js", "fail"],
                ["The server", "juris-kit/server/kernel.js", "createJurisServer"],
                ["The process", "juris-kit/server/process.js", "startProcess"],
                ["A test’s own instance", "juris-kit/server/ssr-renderer.js", "features: { ssr: SSRRenderer }"],
                ["Beside the kernel", "page-cache.js, db.js, http.js, dev-reload.js, bus/", "Cache, driver adapter, cookies, reload, change bus"],
            ],
        ),
        prose("A component reaches Juris through the api argument and imports none of it. Only the two entry points name where Juris lives: client/boot.js on the browser, app.mjs on the server. Shared modules, the ones both sides import, stay free of Node and free of the DOM. client/app.js is one of those. services.js is not mounted, so no browser is served it."),
        rich([
            "Node 24 or later. Both packages are Apache-2.0. The repositories are ",
            { a: "jurisjs/juris", href: "https://github.com/jurisjs/juris" },
            " and ",
            { a: "jurisjs/juris-kit", href: "https://github.com/jurisjs/juris-kit" },
            ".",
        ]),
    ]));

    juris.registerComponent("LessonFiles", (props, api) => {
        const [tab, setTab] = api.useState("tab", "app");
        const current = () => FILES.find((file) => file[0] === tab()) ?? FILES[0];
        return open("files", "Five files, and none of them is plumbing.", [
            lede("A whole app is the routes and components, the browser entry, the services, the server factory, and the process. The first two run on both sides, or in the browser. The last three run on Node and are never mounted for a browser."),
            {
                div: {
                    className: "tabs",
                    role: "tablist",
                    children: FILES.map(([id, name]) => ({
                        button: {
                            type: "button",
                            className: "tab",
                            role: "tab",
                            classList: { on: () => tab() === id },
                            textContent: name,
                            onclick: () => setTab(id),
                        },
                    })),
                },
            },
            {
                figure: {
                    className: "codeblock",
                    children: [
                        { figcaption: { textContent: () => current()[1] } },
                        { pre: { children: [{ code: { textContent: () => current()[2] } }] } },
                    ],
                },
            },
            prose("client/app.js is imported by the server and by the browser. Its register function defines the components, and its routes say which component, which head, and which service calls to preload. Home calls api.live during setup, so the greeting stays subscribed for as long as the component is on the page."),
            prose("client/boot.js is the entry the document loads when the page is idle. It exports start, and start calls hydrate with the same routes, the same register, and the same title options the server used. The import /src/client.js is the juris package, served flat by the kit."),
            prose("services.js is what the app does. greeting checks its argument and calls fail with a sentence a person can read. The return value is plain data. app.mjs is one createJurisServer call, with the services passed in so a test can pass its own. server.mjs is the only file that reads the environment and touches the process: it listens, and it closes on a signal."),
            note("A test is a sixth file. It builds the app with in-memory services, listens on a free port, fetches / and a missing path, and closes. node --test runs it. Nothing in the five files opens a database."),
        ]);
    });

    juris.registerComponent("LessonAtlas", (props, api) => {
        const [id, setId] = api.useState("file", "kernel");
        const current = () => ATLAS.find((file) => file.id === id()) ?? ATLAS[0];
        return open("atlas", "Every file the kit ships.", [
            lede("server/ is Node only. It is never served, it reads no environment variable, and it depends on no npm package but juris. Database drivers are passed in. Pick a file."),
            {
                div: {
                    className: "atlas",
                    children: [
                        {
                            ul: {
                                className: "atlas-list",
                                children: ATLAS.map((file) => ({
                                    li: {
                                        children: [{
                                            button: {
                                                type: "button",
                                                className: "atlas-btn",
                                                classList: { on: () => id() === file.id },
                                                textContent: file.path,
                                                onclick: () => setId(file.id),
                                            },
                                        }],
                                    },
                                })),
                            },
                        },
                        {
                            article: {
                                className: "atlas-body",
                                children: () => [
                                    { p: { className: "kicker", textContent: current().role } },
                                    { h2: { textContent: current().path } },
                                    { p: { textContent: current().body } },
                                ],
                            },
                        },
                    ],
                },
            },
            prose("Beside these, the browser files live in the juris package and arrive at /src/: juris.js, dom-renderer.js, state-manager.js, component-manager.js, router.js, client.js, remote-services.js, live-protocol.js, live-data.js, forms.js, errors.js, html-safety.js, headless.js, fluentstate.js, webcomponent.js, storage.js, clock.js, devtools.js. devtools.js is imported only when the page is in dev mode."),
        ]);
    });

    juris.registerComponent("LessonRequest", () => open("request", "A page request, in an order that does not move.", [
        lede("createPagePipeline handles a request in seven steps. The order is fixed because it is what keeps a page from reaching someone it was not for. A guest’s cached copy is never served past a guard, and a viewer’s page is never stored for the next guest."),
        stage(mountRequestFlow, "Send a request, or click a step. The packet only moves forward."),
        { Stepper: { name: "request", steps: REQUEST } },
        code("handle.js", `
            // What createJurisServer answers with.
            const server = await createJurisServer({ /* the five-file config */ });
            const { url } = await server.listen({ port: 3000 });
            const page = await server.render("/todos/2"); // { status, headers, body }
            await server.invalidate([{ name: "todos" }]);  // a job, a webhook
            await server.close();
        `),
        prose("One Juris instance renders every request. renderRequest keeps them apart by replacing the whole state and serialising it with nothing in between that could yield. Hooks run before that call or after it returns. None run inside it. server.render is the render without the cache, which a test uses. server.invalidate reaches live queries and the bus the way a service’s touches do, for a change that happened outside a service call."),
    ]));

    juris.registerComponent("LessonSsr", () => open("ssr", "The same layout, evaluated once.", [
        lede("On the server a binding runs once and its return value is written into the HTML. Nothing is subscribed. The browser is where the function becomes a subscription. The two passes draw the same elements because they share the layout and the safety rules."),
        stage(mountPasses, "Six bindings. The server column stays at one pass. Each write only grows the browser column."),
        code("ssr.js", `
            import Juris from "juris/juris.js";
            import SSRRenderer from "juris-kit/server/ssr-renderer.js";

            const juris = new Juris({
                isServer: true,
                features: { ssr: SSRRenderer },
                services: { price: async (sku) => ({ milk: 3, eggs: 5 })[sku] },
            });
            juris.registerComponent("Price", (props, api) => ({
                span: { textContent: () => \`\${api.preloaded("price", props.sku)} €\` },
            }));

            const page = await juris.renderRequest({
                preload: [["price", "milk"]],
                state: { cart: { count: 2 } },
                layout: { Price: { sku: "milk" } },
            });
            // page.html is the element, page.json is the state the browser adopts
        `),
        prose("That snippet is the shape. In an app you do not call renderRequest yourself. The kernel does, after the route’s preload. requirePreload is on for the server’s instance: a call made while drawing, that the route did not preload, throws. The render stays a function of the URL and the preloaded data, which is what makes a page cacheable."),
        h2("What preload is for"),
        prose("A route’s preload returns a list of calls: [\"price\", \"milk\"], or a function of the location that returns that list. The server runs them, stores the answers under $ssr.calls, and the render reads them through api.call, api.preloaded or api.live. A call that fails is stored as { $error } with the words exposeError allows. A thrown error from a driver stays on the server. A fail() message, written for the reader, is allowed through."),
        pull("A component that branches on data calls the service during render only because the route preloaded that exact call. The arguments are part of the key. list() and list({}) are two calls."),
        prose("Juris.compile, on the server, draws a layout once with a marker in each slot and splits the HTML into fixed text and places. The fixed text is whatever the string renderer wrote, so a layout stored in a database stays data. There is no second serializer and no eval."),
    ]));

    juris.registerComponent("LessonPage", () => open("page", "Four names the document and the browser agree on.", [
        lede("A cached page, or a tab left open across a deploy, boots whichever build serves it next. The names in the document do not change between builds. #app, #state, #services, start(), and in development #juris-dev."),
        table(
            ["Name", "What it is"],
            [
                ["#app", "The element that holds the server-rendered body. hydrate draws { App: {} } into it again."],
                ["#state", "A JSON script: the state the page was rendered with. Private roots are omitted. < is escaped."],
                ["#services", "A JSON list of the service names the browser may call. Absent when the app turns it off."],
                ["#juris-dev", "Development only. Its presence turns the browser’s dev mode on, unless hydrate is given devMode: false."],
                ["start()", "The entry’s export. The loader imports the module once the page is idle and calls it."],
            ],
        ),
        h2("Reserved roots"),
        table(
            ["Root", "In #state", "What it holds"],
            [
                ["$route", "Yes", "path, query, hash, and the derived name, params, matched, meta"],
                ["$ssr", "Yes, then dropped", "Preloaded answers under calls, or { $error }"],
                ["$local", "Yes", "useState values, so a control adopts what the server drew"],
                ["$async", "Never", "Pending work, groups, and live status when no live client keeps it"],
                ["$server", "Never", "Whatever a render needs that must not leave the server"],
                ["$live", "No", "The browser’s stream: connected, generation, and each path’s status"],
            ],
        ),
        prose("An app adds private roots of its own with privatePaths. A session token set there is used during the render and left out of the JSON. $server is reserved for that kind of value even when you have not listed it. Roots you invent should not start with $."),
        code("state-tag.js", `
            // What the browser finds, abbreviated.
            <main id="app"><h1>Your cart</h1></main>
            <script type="application/json" id="state">{"cart":{"count":2}}</script>
            <script type="application/json" id="services">["addToCart"]</script>
        `),
        note("The loader waits for the page to be idle, requestIdleCallback or a timer where there is none, then import(entry).then((module) => module.start()). The page can be read before that script runs."),
    ]));

    juris.registerComponent("LessonHydrate", () => open("hydrate", "Taking over the page the server wrote.", [
        lede("hydrate(options) is the whole client boot, in the one order that works. boot.js calls it. The options it shares with the server, title and the juris object of allowTags, allowSchemes, allowInnerHTML and components, come from the same module both sides import. A mismatch is the browser taking away what the server drew."),
        stage(mountHydrateChart, "Drag across the boot. The page becomes interactive when the client mounts into #app."),
        { Stepper: { name: "hydrate", steps: HYDRATE } },
        code("boot.js", `
            import { hydrate } from "/src/client.js";
            import { routes, register, title } from "./app.js";

            export const start = () => hydrate({
                routes,
                register,
                title,
                live: true,          // the default: one event stream at /api/events
                beforeMount(juris) { /* a preference the server could not know */ },
            });
        `),
        prose("live: false skips the event stream, which a page with no live queries wants. An object is the live client’s options. plugins are installed after the router and the live client. skewGuard is off unless you name the sessionStorage key. serviceWorker registers when idle. Anything else in the options object is a TypeError, named, before the page is read."),
        rich([
            "After mount, the DOM is the client’s. The server HTML was the first paint and the view for a browser with no script. From here, state writes update bindings the way the Juris lessons showed. The data those bindings show stays current through ",
            { code: "api.live" },
            ", next.",
        ]),
    ]));

    juris.registerComponent("LessonServices", () => open("services", "A service is a function the page can call.", [
        lede("Services are plain async functions. On the server, api.call runs them directly. In the browser, the stub posts JSON to /api/<name> and resolves with the body. The same call() is in the component either way. A refusal the person should read is fail(), from juris/errors.js."),
        code("services.js", `
            import { fail } from "juris/errors.js";

            export const services = {
                async addTodo(title) {
                    if (typeof title !== "string" || !title.trim()) {
                        fail("Give the todo a title.", { field: "title" });
                    }
                    const clean = title.trim().slice(0, 200);
                    await db.query("insert into todos (title) values ($1)", [clean]);
                    return { ok: true };
                },
            };
        `),
        prose("fail throws a ServiceError. expose is true, so the default rule lets the caller read the message. status defaults to 400. fields, or a single field, is what a form puts beside its inputs. code is a name a program can match when the words change. Any other throw, a driver’s words, a stack, a connection string, stays in the server log. The caller reads \"request failed\". exposeError on the server is that rule, and you can pass your own."),
        h2("What the browser is allowed to call"),
        prose("The dispatcher’s names are written into #services. hydrate builds a stub per name. A call is a POST of the arguments. The response is the return value, or { error, fields } when the service refused. Under /api/, a call accepts POST only. Other methods get 405 and Allow: POST. The event stream is the one GET, at /api/events."),
        prose("A service can close over the database, a mailer, the clock. The framework does not inject them. A test passes a services object of fakes into createApp, which is why app.mjs takes services as an argument and server.mjs is the file that imports the real ones. context(req) on the dispatcher is the this a mutation sees: the viewer, the session. A live query does not get that this. The next lesson says why."),
    ]));

    juris.registerComponent("LessonLive", () => open("live", "A query stays current, and only the change travels.", [
        lede("api.live(path, name, ...args) calls a service, writes the answer at path, and keeps it written as the server pushes changes. The subscription ends with the component. Several paths may watch one query. One path belongs to one service: a second service on the same path throws, because a page would otherwise draw the other service’s data after a navigation."),
        stage(mountFanout, "One database read, shared. The byte sizes are illustrated: 32 bytes a field, eight fields in the value."),
        { DemoFrame: { onStart: mountLive, caption: "A model of the dispatcher. The real one speaks SSE. Commit the same text twice and the second run sends nothing." } },
        prose("The stage is a picture of the protocol, running in the page. Two pages subscribe to greeting(\"world\"). One commit changes the value the query would return. Both pages receive the changed leaf. A commit that changes nothing is re-run and sent to nobody. On the real server the grouping is by name and arguments, so a hundred tabs watching the same query cost one database read and one diff."),
        code("live.js", `
            // In the component. The arguments match the route's preload, exactly.
            api.live("greeting", "greeting", "world");
            text: () => api.getState("greeting")?.text ?? ""
            status: () => api.liveState("greeting")  // "live" | "pending" | "failed" | "offline"

            // In createJurisServer.
            api: {
                live: {
                    public: true,
                    queries: ["todos", "greeting"],
                    touches: { addTodo: ["todos"], rename: (name, result) => [{ name: "greeting", args: [name] }] },
                },
            }
        `),
        h2("Queries are pure functions of their arguments"),
        prose("A live query is never invoked with a request as this. One run serves every subscriber, so a session must not be able to leak into a result the server then shares. Mutations do get the request context. touches says which queries a mutation invalidates: a list of names, a target { name, args }, or a function of the arguments and the result. After the mutation succeeds, each distinct subscribed query is re-run and diffed against its last result. Leaves that changed are written on the client with assign, so a value the page already has wakes nothing."),
        prose("public: true says every declared query is for everybody. Without it you pass authorize(name, args, info), called on subscribe and again while the subscription lives. A false result is 403. Losing access stops the patches. The browser reconnects the stream itself and re-sends its subscriptions. liveState is \"pending\" until the first answer, \"live\" once the latest answer is on screen, \"failed\" when the subscribe was refused or the re-run threw, \"offline\" when the stream is down."),
        note("RouterView keeps a page’s instance when only the params change. A hand-written api.live(path, name, api.getState(\"$route.params.id\")) would keep the old arguments. Read the arguments inside the getter. juris/live-data.js does that, and it drops the old subscription only after the new one exists, so a change in the gap is not lost. The previous data stays on screen, and liveState says pending while it is the last route’s data."),
    ]));

    juris.registerComponent("LessonDatabase", () => open("database", "The driver is the app’s. The interface is small.", [
        lede("The kit imports no database driver. You create the pool, adapt it with fromPg, fromMysql2 or fromMariadb, and close over the adapter in your services. query(sql, params) always takes the parameters separately. The SQL uses the driver’s own placeholders: $1 for Postgres, ? for MySQL and MariaDB. The adapter does not translate them."),
        code("db.js", `
            import pg from "pg";
            import { fromPg } from "juris-kit/server/db.js";
            import { fail } from "juris/errors.js";

            const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
            const db = fromPg(pool);

            export const services = {
                async todos() {
                    return db.query("select id, title, done from todos order by id");
                },
                async addTodo(title) {
                    if (typeof title !== "string" || !title.trim()) {
                        fail("Give the todo a title.", { field: "title" });
                    }
                    const clean = title.trim().slice(0, 200);
                    await db.query("insert into todos (title) values ($1)", [clean]);
                    return { ok: true };
                },
            };

            // createApp({ services }) in server.mjs, after the pool exists.
            // onShutdown: [() => pool.end()]
        `),
        h2("Transactions"),
        prose("db.transaction(async (tx) => { ... }) checks out one connection, begins, runs your function’s tx.query calls, and commits. A throw rolls the transaction back and rethrows. If the rollback itself fails, the connection is destroyed rather than returned to the pool, because the next borrower would still be inside the transaction. The value you return from the function is the value the transaction answers."),
        code("tx.js", `
            await db.transaction(async (tx) => {
                await tx.query("insert into todos (title) values ($1)", [clean]);
                await tx.query(
                    "insert into change_events (targets) values ($1)",
                    [JSON.stringify([{ name: "todos" }])],
                );
            });
        `),
        prose("A statement that returns rows answers an array, with rows.fields holding the column names in order. The property is not enumerable, so the rows still serialise as an array and a service can return them straight to the page. A statement that returns no rows answers what the driver reports: an empty array for pg, and an object with affectedRows and insertId for MySQL and MariaDB. An empty result still has fields, which is how a caller learns the shape."),
        note("server.mjs is the file that reads DATABASE_URL and constructs the pool. The kit never reads it. A test never constructs it either: it passes services that return fixtures."),
    ]));

    juris.registerComponent("LessonBus", () => open("bus", "One write, every instance.", [
        lede("Live subscribers and the in-memory registry live in the process that accepted the stream. A second instance does not see them. Without a bus, a mutation updates the pages connected to the instance that ran it, and the other instances keep serving the previous value until something else wakes them. The bus carries the invalidation targets."),
        stage(mountBus, "Advance a write from the instance that committed it to the pages on the other one. The poll slider is the MariaDB wait."),
        code("bus.js", `
            import { createPgOutboxBus, SCHEMA } from "juris-kit/server/bus/pg-outbox.js";

            await pool.query(SCHEMA); // once, in a migration
            const bus = createPgOutboxBus({
                pool,
                targets: { chat: (id) => ({ name: "chat", args: [id] }) },
            });

            const api = serviceDispatcher(services, "/api", {
                live: { queries, touches, bus, public: true },
            });
            await bus.start();
            // prune on a timer: the table is not a history
        `),
        prose("Postgres has LISTEN/NOTIFY, so an instance is woken when a change commits. NOTIFY alone drops anything published while a process was restarting, and it cannot be replayed. The outbox table is the record. NOTIFY is the doorbell: the listener wakes, reads the table, and a sweep catches what the doorbell missed. MariaDB and MySQL have no doorbell, so mysql-outbox.js polls. The latency is the poll interval. The targets and the dispatcher’s view of them are the same."),
        prose("The dispatcher calls bus.publish with the targets of a local invalidation, and bus.subscribe feeds remote ones back in without publishing them again. onInvalidate on the live options sees every target this instance applies, local or remote, before the next request is taken. That is the hook a page cache uses: onInvalidate: (targets) => cache.invalidate(targets). A target of { name: \"$pages\" } means every page. It re-runs no live query. It drops the cache."),
        note("Identifiers for the table and the channel are lowercase and plain. Postgres folds an unquoted LISTEN name to lowercase and does not fold the string you passed to pg_notify. A capital would notify one channel and listen on another, and every change would wait for the sweep. The bus refuses anything that is not a lowercase identifier."),
    ]));

    juris.registerComponent("LessonServer", () => open("server", "Modules, cache, reload, and the process.", [
        lede("Four modules sit around the request. The module server makes the no-build promise true. The page cache keeps guest pages that are functions of their URL. Development reload restarts the process or the page, whichever the file belongs to. process.js decides whether this process serves."),
        h2("The files a browser loads"),
        prose("Mounts are the allowlist. { url: \"/client/\", dir: \"client\" } serves that directory under that prefix, one level deep, .js only, unless depth and only say otherwise. CSS is allowed when you list it. The framework’s own files appear at /src/ and nowhere else. A production response stamps absolute imports with the build, so a page that loaded boot.js from build A cannot import a sibling from build B. Minify runs in production only, and only as far as whitespace and comments. Development sends the bytes you wrote."),
        h2("What may be cached"),
        table(
            ["Decision", "When", "What happens"],
            [
                ["static", "No reactive function, no call", "Cache, and never expire"],
                ["dependent", "Read only preloaded services", "Drop when one of them is invalidated, or refresh after the TTL"],
                ["volatile", "A plugin flagged the render", "Never cache"],
                ["incomplete", "An unregistered component was drawn", "Never cache"],
                ["failed", "A preloaded call failed", "Never cache, and leave the previous page"],
                ["personal", "Rendered for a signed-in viewer", "Never cache"],
            ],
        ),
        prose("The kernel’s createJurisServer will not take a cache on its own. The dispatcher it builds does not feed one, and a page kept until its TTL would ignore a write. Build the dispatcher with live.onInvalidate pointing at cache.invalidate, and pass that dispatcher as api. A known change drops the page and the next guest waits for a render. A TTL serves the stale HTML and regenerates a single copy behind it."),
        h2("Development, and more than one process"),
        code("process.js", `
            import { startProcess } from "juris-kit/server/process.js";
            import { devReload } from "juris-kit/server/dev-reload.js";

            if (startProcess({ workers: 1 }) === "primary") {
                // This process only forked. It does not listen.
            }

            const reload = devReload({
                root: new URL(".", import.meta.url),
                restartOn: ["server.mjs", "app.mjs", "services.js"],
                reloadOn: ["client/site.css"],
                onRestart: (file) => { /* start the successor, then let this process go */ },
            });
            // pass devReload: reload into createJurisServer, and only when dev is true
        `),
        prose("Call startProcess first. A refusal has to happen before a pool or a job exists. workers above 1 together with live queries throws, unless you pass allow because you have made the live layer cross workers yourself, or liveQueries: false because the app has none. The way to run more than one process with live queries is separate instances behind a balancer that pins a client to one instance, plus the change bus so a write on one instance reaches the streams on the others."),
        prose("devReload’s onRestart is yours because only the entry may spawn the next process. The framework watches its own directories and whatever restartOn names, and it watches through the directory so an editor that saves by renaming is heard. reloadOn is the files that should refresh the browser and leave the process up. Close the reload client in the server’s shutdown, with the bus and the pool, in onShutdown."),
        pull("The page is readable before any script. The browser then makes that same page interactive. Live queries keep the parts that depend on data up to date, and only those parts run again."),
    ]));
}
