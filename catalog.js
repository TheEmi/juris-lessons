// The guide's contents. Paths are hash-router paths: the address bar shows /#/motion.
export const chapters = [
    {
        id: "juris",
        label: "Juris",
        kicker: "The browser",
        lessons: [
            { path: "/", name: "start", title: "Start", component: "LessonStart" },
            { path: "/layouts", name: "layouts", title: "Layouts", component: "LessonLayouts" },
            { path: "/state", name: "state", title: "State", component: "LessonState" },
            { path: "/grain", name: "grain", title: "Fine grain", component: "LessonGrain" },
            { path: "/components", name: "components", title: "Components", component: "LessonComponents" },
            { path: "/lists", name: "lists", title: "Lists", component: "LessonLists" },
            { path: "/derived", name: "derived", title: "Derived", component: "LessonDerived" },
            { path: "/local", name: "local", title: "Local state", component: "LessonLocal" },
            { path: "/motion", name: "motion", title: "Motion", component: "LessonMotion" },
            { path: "/events", name: "events", title: "Events", component: "LessonEvents" },
            { path: "/forms", name: "forms", title: "Forms", component: "LessonForms" },
            { path: "/router", name: "router", title: "Router", component: "LessonRouter" },
            { path: "/headless", name: "headless", title: "Headless", component: "LessonHeadless" },
        ],
    },
    {
        id: "kit",
        label: "Juris Kit",
        kicker: "The server",
        lessons: [
            { path: "/split", name: "split", title: "The split", component: "LessonSplit" },
            { path: "/files", name: "files", title: "Five files", component: "LessonFiles" },
            { path: "/atlas", name: "atlas", title: "File atlas", component: "LessonAtlas" },
            { path: "/request", name: "request", title: "A request", component: "LessonRequest" },
            { path: "/ssr", name: "ssr", title: "SSR", component: "LessonSsr" },
            { path: "/page", name: "page", title: "The page", component: "LessonPage" },
            { path: "/hydrate", name: "hydrate", title: "Hydration", component: "LessonHydrate" },
            { path: "/services", name: "services", title: "Services", component: "LessonServices" },
            { path: "/live", name: "live", title: "Live data", component: "LessonLive" },
            { path: "/database", name: "database", title: "Databases", component: "LessonDatabase" },
            { path: "/bus", name: "bus", title: "Change bus", component: "LessonBus" },
            { path: "/server", name: "server", title: "Around it", component: "LessonServer" },
        ],
    },
];

let numbered;
function withNumbers() {
    if (numbered) return numbered;
    let i = 0;
    numbered = chapters.map((chapter) => ({
        ...chapter,
        lessons: chapter.lessons.map((lesson) => ({
            ...lesson,
            n: String(++i).padStart(2, "0"),
            book: chapter.label,
        })),
    }));
    return numbered;
}

export function navChapters() {
    return withNumbers();
}

export function allLessons() {
    return withNumbers().flatMap((chapter) => chapter.lessons);
}

export function lessonByName(name) {
    return allLessons().find((lesson) => lesson.name === name);
}

export function titleFor(name) {
    return lessonByName(name)?.title ?? "Juris";
}

export const routes = [
    ...allLessons().map((lesson) => ({
        path: lesson.path,
        name: lesson.name,
        component: lesson.component,
        head: { title: lesson.title },
    })),
    { path: "*", name: "missing", component: "LessonMissing", head: { title: "Not found" } },
];
