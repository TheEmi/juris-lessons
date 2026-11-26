import { open, lede, prose, rich, code, note, pull, h2 } from "./ui.js";
import {
    mountCounter,
    mountLayouts,
    mountGrain,
    mountGreetings,
    mountTodos,
    mountCart,
    mountLikes,
    mountMotion,
    mountName,
    mountForm,
    mountFluent,
} from "./demos.js";

const frame = (onStart, caption, tone) => ({ DemoFrame: { onStart, caption, tone } });

export function registerJurisLessons(juris) {
    juris.registerComponent("LessonStart", () => open("start", "A page is a plain object.", [
        lede("Juris is a framework for server-rendered pages that stay live. Layouts are ordinary objects, the same ones on the server and in the browser. A function in that object is a binding: it runs again when the state it read changes, and only it runs."),
        prose("The work is split across two packages. juris is what a browser downloads: state, the DOM renderer, the router, forms, and the client that boots a page. juris-kit is the Node half: the server, the string renderer, services, and live queries. An app usually installs the kit and gets Juris with it. There is no build step and no runtime dependency. The file on disk is the module the browser runs."),
        {
            div: {
                className: "jump",
                children: [
                    {
                        Link: {
                            to: "/layouts",
                            className: "jump-card",
                            activeClass: "jump-on",
                            children: [
                                { span: { className: "kicker", textContent: "Juris" } },
                                { strong: { textContent: "Layouts, state, and motion" } },
                            ],
                        },
                    },
                    {
                        Link: {
                            to: "/split",
                            className: "jump-card",
                            activeClass: "jump-on",
                            children: [
                                { span: { className: "kicker", textContent: "Juris Kit" } },
                                { strong: { textContent: "SSR, services, and live data" } },
                            ],
                        },
                    },
                ],
            },
        },
        pull("This guide is a Juris app. The spine is a router. Each lesson is a component. The stages below are their own instances, so a demo can stop without taking the page with it."),
        frame(mountCounter, "A counter. The figure is textContent reading count."),
        code("counter.js", `
            import Juris from "juris/juris.js";

            const juris = new Juris({ state: { count: 0 } });

            juris.registerComponent("Counter", (props, api) => ({
                div: {
                    children: [
                        { p: { textContent: () => api.getState("count", 0) } },
                        { button: { textContent: "+1", onclick: () => api.updateState("count", (n) => n + 1) } },
                    ],
                },
            }));

            juris.render(document.getElementById("app"), { Counter: {} });
        `),
        rich([
            "The same layout is what the kit renders to HTML. ",
            { code: "renderToString" },
            " and ",
            { code: "renderRequest" },
            " live in the kit, so a browser never downloads the string renderer. The lessons under Juris stay in the browser. The lessons under Juris Kit follow a request from the socket to a live page.",
        ]),
        note("The examples track Juris 0.93. The contract, every option and every refusal, is REFERENCE.md in the juris-kit repository."),
    ]));

    juris.registerComponent("LessonLayouts", () => open("layouts", "One key, and that key is the tag.", [
        lede("A layout is a plain object with a single key. The key is the element. The value is its content: a string, a number, null, or an object of attributes and children."),
        frame(mountLayouts, "The tag and the sentence are state. children returns the element."),
        code("layout.js", `
            juris.renderToString({
                div: {
                    className: "card",
                    children: [{ h2: "Milk" }, { p: "2 bottles" }],
                },
            });
            // <div class="card"><h2>Milk</h2><p>2 bottles</p></div>

            juris.renderToString({ p: "Fish & chips" });
            // <p>Fish &amp; chips</p>
        `),
        prose("Text is escaped. A string or a number as the content is the element’s text, so { span: 0 } is a span whose text is 0. true and false are nothing, which makes { p: isAdmin && \"Admin\" } an empty paragraph when isAdmin is false. null is an empty element."),
        h2("What a content object holds"),
        prose("children is a layout, a list of layouts, text, or a function. textContent is text, and it is the whole element: children beside it are left out. className becomes the class attribute. Functions in the content are bindings, covered with state. A capitalised key is a component, and its value is the component’s props. Give components capital names so a component never takes the place of an element."),
        rich([
            "innerHTML is left out unless the instance was constructed with ",
            { code: "allowInnerHTML: true" },
            ". It is for markup the app itself wrote. Data goes in textContent, which is escaped.",
        ]),
    ]));

    juris.registerComponent("LessonState", () => open("state", "Read a path. Write a path.", [
        lede("State is a tree of plain data, addressed by a dotted path. A binding that calls getState subscribes to the path it read. setValue replaces what is there. updateState hands the current value to a function and stores what it returns."),
        prose("The counter on the first page is the whole idea. getState(\"count\", 0) reads count and, if the path is empty, uses 0. updateState(\"count\", (n) => n + 1) writes the next number. The paragraph’s function runs again. The button’s function does not, because it did not read count. disabled is itself a binding, so the Reset button updates on its own."),
        code("state.js", `
            api.setValue("cart", { items: 2, total: 30 });
            api.getState("cart.items");                 // 2
            api.getState("cart.coupon", "none");        // "none"
            api.updateState("cart.items", (n) => n + 1);
            api.deleteState("cart.total");

            api.batch(() => {
                api.setValue("user.name", "Grace");
                api.setValue("user.name", "Grace Hopper");
            });
            // readers of user.name wake once, with the last write

            api.assign("user", { name: "Ada", city: "Paris" });
            // writes leaf by leaf: a reader of user.name stays asleep
            // when the name is the same and the city changed

            api.peek("user.city"); // a read that subscribes to nothing
        `),
        prose("batch holds the notifications and flushes once, so two writes to the same path wake a reader once. assign writes each leaf and leaves a reader of an unchanged leaf asleep. peek reads without subscribing: use it for a value the binding should see and not follow. clearState replaces the tree, which is what a server does between requests."),
        note("Paths the framework owns start with $. An app’s own roots should not. $route, $ssr, $local, $async, $server and $live are reserved, and the page-contract lesson says which of them are sent to the browser."),
    ]));

    juris.registerComponent("LessonGrain", () => open("grain", "Only the binding that read it runs.", [
        lede("A write wakes the bindings that read that path. The component’s function does not run again. The neighbouring cells do not run again. The × under a figure is the number of times that cell’s own function has run."),
        frame(mountGrain, "Twenty-four bindings. Touch one path."),
        prose("Touch cell 3. Its value goes up and its × goes up. The other twenty-three stay where they were. Touch every cell and each binding runs once, inside one batch, so a reader is notified after the batch rather than between the writes."),
        pull("The last-write line is a separate binding. It read last, so it runs when last changes, and the cells that did not read last stay still."),
        code("grain.js", `
            {
                button: {
                    textContent: () => {
                        const value = api.getState("cells.3", 0);
                        return String(value);
                    },
                    onclick: () => api.updateState("cells.3", (n) => n + 1),
                },
            }
        `),
        prose("That is the discipline the rest of the guide keeps. Put the read inside the function that should update. A read in the component body, or in a children function, subscribes that larger function, and a write then redraws everything it returned. The list lesson shows the same rule across a row."),
    ]));

    juris.registerComponent("LessonComponents", () => open("components", "A component is a function from props to a layout.", [
        lede("registerComponent(name, (props, api) => layout) stores the function under a capitalised name. The layout { Greeting: { name: \"Ada\" } } calls it with those props and the same api every component on the instance shares. A name is registered once. A second registration throws. install(key, registrar) is how a module registers its components once across pages."),
        frame(mountGreetings, "Both greetings read greeting. Neither reads note."),
        code("component.js", `
            juris.registerComponent("Greeting", (props, api) => ({
                h1: { textContent: () => \`\${api.getState("greeting")}, \${props.name}\` },
            }));

            juris.render(page, {
                div: {
                    children: [
                        { Greeting: { name: "Ada" } },
                        { Greeting: { name: "Grace" } },
                    ],
                },
            });
        `),
        prose("Change the greeting and both × counts move, because both functions read greeting. Write the unread path and those counts stay: the hint under the buttons has the binding that read note. The component functions ran at setup and have not run since."),
        h2("A definition can return a function"),
        prose("Return a function instead of a layout and that function is drawn again whenever what it reads changes. It may return a different element, which is how a badge swaps a strong for an em. The component is set up again when that outer function returns it, so a component you want to keep should sit in children, where the same props keep the instance. A definition that is async draws nothing: keep the definition plain and return a function that returns the promise if the browser should fill the place when it settles. The server does not wait for that promise."),
        rich([
            "registerComponent(name, definition, { ssr: false }) is a component the server never draws. It leaves a marker, and the browser draws it. A chart on a canvas is the usual case. Lifecycle hooks, ",
            { code: "onMount" },
            ", ",
            { code: "onCleanup" },
            " and ",
            { code: "onError" },
            ", are valid during setup. onError makes the component an error boundary and returns the layout to show instead.",
        ]),
    ]));

    juris.registerComponent("LessonLists", () => open("lists", "A seat redraws its children, and keeps what it can.", [
        lede("A function given as children is a seat. It may return a list. It runs again when the state it read changes. A component it returns again with the same props is kept: its setup does not run again. A function in one child’s place stands for that one child and returns one layout, and a component inside it is set up again every time."),
        frame(mountTodos, "The title binding reads the title. The check binding reads done."),
        prose("Each row is a component whose props are the id. The title function reads items.<id>.title. The checkbox and the check counter read items.<id>.done. Toggle a row: the check count moves, the title count stays, and the strike-through follows done through its own class binding. Add a line and the seat reads order, so it runs again. A row whose id is the same number is kept, and its title binding does not run again."),
        code("list.js", `
            ul: {
                children: () => api.getState("order", []).map((id) => ({
                    Todo: { key: id, id },
                })),
            }

            // Inside Todo. The title does not read done.
            textContent: () => api.getState(\`items.\${props.id}.title\`, "")
            checked: () => Boolean(api.getState(\`items.\${props.id}.done\`))
        `),
        note("A component returns one layout, never a list. A function sitting in one child’s place returns one layout too. The function that is children itself is the one that may return a list. Wrap a list in an element when a component has to hand back several siblings."),
    ]));

    juris.registerComponent("LessonDerived", () => open("derived", "compute keeps a path that is a function of others.", [
        lede("compute(path, (api) => value) stores a value that is re-derived when the paths the resolver read change. A computed made during a component’s setup is disposed with the component, which matters on a server: one instance renders every request, and a computed left behind would pile up."),
        frame(mountCart, "total is computed from the lines. × counts how often that binding runs."),
        code("compute.js", `
            api.setValue("lines", [
                { sku: "Milk", price: 3, qty: 1 },
                { sku: "Eggs", price: 5, qty: 2 },
            ]);

            api.compute("total", (api) =>
                api.getState("lines", []).reduce((sum, line) => sum + line.price * line.qty, 0),
            );

            api.getState("total"); // 13
            api.updateState("lines.0.qty", (qty) => qty + 1);
            api.getState("total"); // 16
        `),
        prose("The resolver receives the api, and the reads inside it are the dependencies. A later write to lines.0.qty wakes the total. A binding that shows the total reads total, so it follows. compute also takes { watch: [\"todos.*.done\"] } when the dependency is a wildcard the read itself cannot see, or a path the resolver only peeked."),
        rich([
            "bindState(resolver, apply) is the lower-level form: the resolver reads, and apply is called with the result. A bindState made in a component body outlives the component unless you pass its stop function to ",
            { code: "onCleanup" },
            ". On a shared server instance that leak is one more binding per request. This guide’s document title is a bindState on the shell, ended in onCleanup.",
        ]),
    ]));

    juris.registerComponent("LessonLocal", () => open("local", "useState is a path the component owns.", [
        lede("useState(key, initial) returns a getter and a setter. The value lives at $local.<Component>.<n>.<key>, numbered in render order among the instances that call useState. Two Like buttons are two instances, so each heart has its own count."),
        frame(mountLikes, "Same component, two instances, two paths."),
        code("local.js", `
            juris.registerComponent("Like", (props, api) => {
                const [likes, setLikes] = api.useState("likes", 0);
                return {
                    button: {
                        onclick: () => setLikes((n) => n + 1),
                        textContent: () => \`♥ \${likes()}\`,
                    },
                };
            });
        `),
        prose("$local is written into the page’s state, so a server-rendered control adopts its value when the browser boots. Nothing secret belongs there. A component registered with ssr: false keeps its local state under $local.$client, because the server never numbered those instances. The setter accepts a value or an updater, the same way updateState does."),
    ]));

    juris.registerComponent("LessonMotion", () => open("motion", "HTML elements, moved by one number.", [
        lede("A frame writes a single path, t. Every letter and every disc whose style function read t runs again and sets transform. Nothing else on the page read t, so the lesson around the stage stays as it was. The counter is how many of those bindings have run."),
        frame(mountMotion, "One write per frame. A binding per element.", "dark"),
        prose("The word is eleven spans. The discs are spans too, positioned in the middle of the stage, moved with translate. The seat that builds the discs reads count, so the slider recreates the field. It does not read t, so a frame does not rebuild the list. Play and pause start and stop the animation frame. If the system asks for reduced motion, the stage waits for Play."),
        code("motion.js", `
            span: {
                textContent: letter,
                style: () => {
                    const t = api.getState("t", 0);
                    const y = Math.sin(t * 3.1 + index * 0.48) * 18;
                    return { transform: \`translateY(\${y}px)\` };
                },
            }
        `),
        prose("style as an object is applied property by property. A function that returns that object is a binding, so a frame touches transform and leaves the rest of the element alone. Colour, opacity and a custom property work the same way. The kit’s string renderer evaluates the function once, writes the inline style into the HTML, and subscribes to nothing. The browser is where the loop lives."),
        note("Drag the disc count upward. The binding counter accelerates because each new disc reads t and runs on every frame. That cost is the point of the fine-grain lesson: subscribe the elements that move, and keep the rest of the tree off that path."),
    ]));

    juris.registerComponent("LessonEvents", () => open("events", "Events write. Bindings read.", [
        lede("An onclick, oninput or onsubmit on an element is a listener, not a binding. It runs when the browser fires the event. The listener writes state. A different function reads it and updates the text."),
        frame(mountName, "The field writes name. The sentence reads it."),
        code("events.js", `
            label: {
                children: [
                    { span: "Name" },
                    {
                        input: {
                            type: "text",
                            oninput: (event) => api.setValue("name", event.target.value),
                        },
                    },
                ],
            },
            p: { textContent: () => \`Hello, \${api.getState("name", "")}\` },
        `),
        prose("A value function on the input would make it controlled: the binding writes the property whenever name changes. That is what the form plugin does per field, so one keystroke updates one input. For a field whose only job is to capture typing, the event alone is enough, and a sibling reads the path. disabled, checked and classList take functions too, and those are bindings: they re-run when the state they read changes."),
        rich([
            "Listeners are named on*. Any other function prop passed to a component is treated as a getter, and dev mode warns if the component never calls it. Call it inside a binding, or read it with ",
            { code: "api.prop" },
            ".",
        ]),
    ]));

    juris.registerComponent("LessonForms", () => open("forms", "A form is a path.", [
        lede("forms() is a plugin. juris.use(forms()) adds api.form(path, options). The values, the touched flags, the errors and the submitting bit all live under that path, one path per field, so a keystroke wakes the input that changed."),
        frame(mountForm, "Try an address without @, a short password, then anything@end.example.com. example.com is refused by the service."),
        code("form.js", `
            import { forms } from "juris/forms.js";
            import { fail } from "juris/errors.js";

            juris.use(forms());

            const form = api.form("signin", {
                fields: { email: "", password: "" },
                validate: {
                    email: (value) => (value.includes("@") ? null : "Use an email address."),
                    password: (value) => (value.length >= 8 ? null : "At least 8 characters."),
                },
                submit(values) {
                    if (values.email.endsWith("@example.com")) {
                        fail("That domain is reserved.", { field: "email" });
                    }
                    return { name: values.email.split("@")[0] };
                },
                onSuccess: (result) => api.setValue("signedIn", result.name),
            });

            // form.field("email") is the input's props
            // form.error("email") is the message, once the field is touched or the form was submitted
            // form.props() is the <form>: method post, novalidate, onsubmit
        `),
        prose("Validation rules are computeds. A rule that reads two fields wakes when either changes. Errors show for a field after blur, or for every field after a submit. fail throws a ServiceError whose message is written for the person reading it, and whose fields sit beside the inputs. A service the browser calls over HTTP returns the same shape, which the services lesson covers. The form’s method is post, so a submit that races ahead of the script puts nothing in the URL."),
        note("Two forms on one path are one form. A component’s form is disposed with the component. Give each form its own path."),
    ]));

    juris.registerComponent("LessonRouter", (props, api) => open("router", "The route is state under $route.", [
        lede("createRouter({ routes, mode }) is a plugin. It registers RouterView and Link, and it keeps the address in state. Writing $route.path is navigation. In the browser the URL follows. On the server nothing touches a location: router.resolve(url) returns the state, the params and whether the address is a 404."),
        prose("This guide uses hash mode, so a static host can open any lesson on refresh. The address looks like /#/motion. History mode is the default and belongs with the kit, which answers every path with the app."),
        {
            dl: {
                className: "route-now",
                children: [
                    { dt: { textContent: "path" } },
                    { dd: { textContent: () => api.getState("$route.path", "/") } },
                    { dt: { textContent: "name" } },
                    { dd: { textContent: () => api.getState("$route.name", "") } },
                ],
            },
        },
        prose("Open another lesson and come back. The pager writes the path through Link, and these two bindings read it. name, params, matched and meta are derived from the path, leaf by leaf, so a reader of $route.params.id wakes when the id changes."),
        code("router.js", `
            import { createRouter } from "juris/router.js";

            const router = createRouter({
                mode: "hash",
                routes: [
                    { path: "/", name: "start", component: "LessonStart", head: { title: "Start" } },
                    { path: "/motion", name: "motion", component: "LessonMotion", head: { title: "Motion" } },
                    { path: "*", name: "missing", component: "LessonMissing" },
                ],
            });
            juris.use(router);

            // { App: {} } renders { RouterView: {} }
            // Link: { to: "/motion", textContent: "Motion" }
        `),
        h2("What a route record holds"),
        prose("path, name and component name the page. head.title is the page’s name, and head.titleFrom(data) names it from the route’s own preloaded call. preload lists the service calls the server runs before drawing. load and register fetch the page’s module and register its components, and navigate waits for them so the page you are leaving stays up until the next one can draw. guard(to, ctx) decides who may open a route. The server’s router asks the same guard, with the viewer as context. meta travels with the match. A route may redirect."),
        note("RouterView takes depth for a nested outlet. It is keyed by the matched record, so moving from /todos/1 to /todos/2 keeps the page’s instance and updates the param readers. That is why a live subscription has to read its arguments inside a binding, which the live-data lesson shows."),
    ]));

    juris.registerComponent("LessonHeadless", () => open("headless", "Logic with no element, and state by property.", [
        lede("headless.js, fluentstate.js and webcomponent.js carry three older APIs onto this core. A headless component is made once per instance. Its api joins the component api under a name, so a button can call api.cart.add without an element of its own."),
        frame(mountFluent, "$.user.name is the path user.name. The sentence reads it."),
        code("fluent.js", `
            import Juris from "juris/juris.js";
            import { HeadlessManager } from "juris/headless.js";
            import { createFluentStateHeadless } from "juris/fluentstate.js";

            const juris = new Juris({
                features: { headless: HeadlessManager },
                headlessComponents: {
                    fluentState: { fn: createFluentStateHeadless, options: { autoInit: true } },
                },
            });

            const $ = juris.getHeadlessAPI("fluentState").getFluentStates();
            $.user.name = "Ada";          // setValue("user.name", "Ada")
            $.todos.push({ title: "Write" });

            // inside a binding, the read subscribes
            p: { textContent: () => $.user.name }
        `),
        prose("A fluent object is a proxy for a path. Reading a primitive returns the value. Reading anything else returns another fluent object, so $.user.city works before the object exists. $.x.user.name reads without subscribing. subscribe, update, clear, exists and raw sit on the fluent object. In a component the same api is api.fluentState."),
        rich([
            "webcomponent.js wraps a layout in a custom element: ",
            { code: "juris.createWebComponent(\"user-name\", () => ({ b: { textContent: () => $.user.name } }))" },
            ". The features option is how the instance is given HeadlessManager, and it is the same option the kit uses to hand a server instance the string renderer.",
        ]),
    ]));
}
