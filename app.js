import Juris from "./vendor/juris.js";
import { createRouter } from "./vendor/router.js";
import { allLessons, navChapters, routes, titleFor } from "./catalog.js";
import { registerJurisLessons } from "./lessons.js";
import { registerKitLessons } from "./kit.js";

const juris = new Juris({ state: { nav: false } });
juris.use(createRouter({ routes, mode: "hash", scroll: false }));

juris.registerComponent("DemoFrame", (props, api) => {
    let stop = () => {};
    api.onMount((el) => {
        const mount = el.querySelector(".demo-mount");
        const end = props.onStart?.(mount);
        if (typeof end === "function") stop = end;
    });
    api.onCleanup(() => stop());
    return {
        div: {
            className: props.tone === "dark" ? "demo dark" : "demo",
            children: [
                {
                    header: {
                        className: "demo-cap",
                        children: [
                            { span: { className: "live-dot", textContent: "Live" } },
                            { span: { textContent: props.caption } },
                        ],
                    },
                },
                { div: { className: "demo-mount" } },
            ],
        },
    };
});

juris.registerComponent("Spine", (props, api) => ({
    aside: {
        className: () => (api.getState("nav") ? "spine open" : "spine"),
        children: [
            {
                Link: {
                    to: "/",
                    className: "mark",
                    exact: true,
                    activeClass: "mark-on",
                    onclick: () => api.setValue("nav", false),
                    children: [
                        { span: { className: "mark-j", textContent: "Juris" } },
                        { span: { className: "mark-sub", textContent: "Field guide" } },
                    ],
                },
            },
            {
                nav: {
                    className: "toc",
                    "aria-label": "Lessons",
                    children: navChapters().map((chapter) => ({
                        div: {
                            className: "nav-group",
                            children: [
                                { p: { className: "nav-label", textContent: chapter.label } },
                                ...chapter.lessons.map((lesson) => ({
                                    Link: {
                                        to: lesson.path,
                                        className: "nav-link",
                                        exact: true,
                                        activeClass: "on",
                                        onclick: () => api.setValue("nav", false),
                                        children: [
                                            { span: { className: "nav-n", textContent: lesson.n } },
                                            { span: { textContent: lesson.title } },
                                        ],
                                    },
                                })),
                            ],
                        },
                    })),
                },
            },
            {
                footer: {
                    className: "spine-foot",
                    children: [
                        { a: { href: "https://github.com/jurisjs/juris", textContent: "juris", target: "_blank", rel: "noreferrer" } },
                        { span: { textContent: "  ·  " } },
                        { a: { href: "https://github.com/jurisjs/juris-kit", textContent: "juris-kit", target: "_blank", rel: "noreferrer" } },
                        { span: { className: "spine-ver", textContent: "0.93  ·  Apache-2.0" } },
                    ],
                },
            },
        ],
    },
}));

juris.registerComponent("Topbar", (props, api) => ({
    header: {
        className: "topbar",
        children: [
            {
                button: {
                    type: "button",
                    className: "menu",
                    textContent: "Lessons",
                    onclick: () => api.setValue("nav", true),
                },
            },
            { p: { className: "top-title", textContent: () => titleFor(api.getState("$route.name", "start")) } },
        ],
    },
}));

juris.registerComponent("Scrim", (props, api) => () => (
    api.getState("nav")
        ? {
            button: {
                type: "button",
                className: "scrim",
                "aria-label": "Close lessons",
                onclick: () => api.setValue("nav", false),
            },
        }
        : { span: { className: "scrim-off" } }
));

juris.registerComponent("NextPrev", (props, api) => ({
    nav: {
        className: "pager",
        "aria-label": "Lesson pager",
        children: () => {
            const list = allLessons();
            const name = api.getState("$route.name", "start");
            const index = list.findIndex((lesson) => lesson.name === name);
            if (index < 0) {
                return [{ Link: { to: "/", className: "pager-link", textContent: "Start" } }];
            }
            const prev = list[index - 1];
            const next = list[index + 1];
            return [
                prev
                    ? { Link: { to: prev.path, className: "pager-link prev", textContent: `${prev.n}  ${prev.title}` } }
                    : { span: { className: "pager-link quiet", textContent: "Start" } },
                next
                    ? { Link: { to: next.path, className: "pager-link next", textContent: `${next.title}  ${next.n}` } }
                    : { span: { className: "pager-link quiet", textContent: "End" } },
            ];
        },
    },
}));

juris.registerComponent("LessonMissing", () => ({
    article: {
        className: "sheet",
        children: [
            { p: { className: "kicker", textContent: "Missing" } },
            { h1: { textContent: "Nothing at this address" } },
            { p: { className: "prose", textContent: "The lessons are listed in the spine." } },
        ],
    },
}));

juris.registerComponent("App", (props, api) => {
    const stopTitle = api.bindState(
        () => api.getState("$route.name", "start"),
        (name) => { document.title = `${titleFor(name)} · Juris`; },
    );
    const stopScroll = api.bindState(
        () => api.getState("$route.path", "/"),
        () => {
            api.setValue("nav", false);
            requestAnimationFrame(() => {
                const main = document.getElementById("lesson");
                if (main) main.scrollTop = 0;
            });
        },
    );
    let detach = () => {};
    api.onMount(() => {
        const onKey = (event) => {
            if (event.key === "Escape") api.setValue("nav", false);
        };
        document.addEventListener("keydown", onKey);
        detach = () => document.removeEventListener("keydown", onKey);
    });
    api.onCleanup(() => {
        stopTitle();
        stopScroll();
        detach();
    });
    return {
        div: {
            className: "shell",
            children: [
                {
                    button: {
                        type: "button",
                        className: "skip",
                        textContent: "Skip to lesson",
                        onclick: () => document.getElementById("lesson")?.focus(),
                    },
                },
                { Spine: {} },
                {
                    div: {
                        className: "maincol",
                        children: [
                            { Topbar: {} },
                            { Scrim: {} },
                            {
                                main: {
                                    id: "lesson",
                                    className: "lesson",
                                    tabIndex: -1,
                                    children: [{ RouterView: {} }, { NextPrev: {} }],
                                },
                            },
                        ],
                    },
                },
            ],
        },
    };
});

registerJurisLessons(juris);
registerKitLessons(juris);
juris.render(document.getElementById("app"), { App: {} });
