
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let canvas_1;
    	let t0;
    	let div0;
    	let select;
    	let option0;
    	let option1;
    	let t3;
    	let input0;
    	let input0_disabled_value;
    	let t4;
    	let input1;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let t9;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			canvas_1 = element("canvas");
    			t0 = space();
    			div0 = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Pencil";
    			option1 = element("option");
    			option1.textContent = "Eraser";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Clear All";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Undo";
    			t9 = space();
    			button2 = element("button");
    			button2.textContent = "Redo";
    			attr_dev(canvas_1, "width", "550");
    			attr_dev(canvas_1, "height", "500");
    			attr_dev(canvas_1, "class", "svelte-1p9422l");
    			add_location(canvas_1, file, 97, 2, 2483);
    			option0.__value = "source-over";
    			option0.value = option0.__value;
    			add_location(option0, file, 101, 6, 2651);
    			option1.__value = "destination-out";
    			option1.value = option1.__value;
    			add_location(option1, file, 102, 6, 2701);
    			attr_dev(select, "class", "svelte-1p9422l");
    			if (/*brushType*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[9].call(select));
    			add_location(select, file, 100, 4, 2572);
    			attr_dev(input0, "type", "color");
    			input0.disabled = input0_disabled_value = /*brushType*/ ctx[3] === "eraser";
    			attr_dev(input0, "class", "svelte-1p9422l");
    			add_location(input0, file, 104, 4, 2767);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "10");
    			attr_dev(input1, "class", "svelte-1p9422l");
    			add_location(input1, file, 109, 4, 2875);
    			attr_dev(button0, "class", "svelte-1p9422l");
    			add_location(button0, file, 110, 4, 2942);
    			attr_dev(button1, "class", "svelte-1p9422l");
    			add_location(button1, file, 111, 4, 2996);
    			attr_dev(button2, "class", "svelte-1p9422l");
    			add_location(button2, file, 112, 4, 3038);
    			attr_dev(div0, "class", "tools");
    			add_location(div0, file, 99, 2, 2548);
    			attr_dev(div1, "class", "app-container svelte-1p9422l");
    			add_location(div1, file, 96, 0, 2453);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, canvas_1);
    			/*canvas_1_binding*/ ctx[8](canvas_1);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			select_option(select, /*brushType*/ ctx[3], true);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*strokeColor*/ ctx[1]);
    			append_dev(div0, t4);
    			append_dev(div0, input1);
    			set_input_value(input1, /*lineWidth*/ ctx[2]);
    			append_dev(div0, t5);
    			append_dev(div0, button0);
    			append_dev(div0, t7);
    			append_dev(div0, button1);
    			append_dev(div0, t9);
    			append_dev(div0, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[9]),
    					listen_dev(select, "change", /*change_handler*/ ctx[10], false, false, false, false),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[12]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[12]),
    					listen_dev(button0, "click", /*clearCanvas*/ ctx[6], false, false, false, false),
    					listen_dev(button1, "click", /*undo*/ ctx[4], false, false, false, false),
    					listen_dev(button2, "click", /*redo*/ ctx[5], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*brushType*/ 8) {
    				select_option(select, /*brushType*/ ctx[3]);
    			}

    			if (dirty & /*brushType*/ 8 && input0_disabled_value !== (input0_disabled_value = /*brushType*/ ctx[3] === "eraser")) {
    				prop_dev(input0, "disabled", input0_disabled_value);
    			}

    			if (dirty & /*strokeColor*/ 2) {
    				set_input_value(input0, /*strokeColor*/ ctx[1]);
    			}

    			if (dirty & /*lineWidth*/ 4) {
    				set_input_value(input1, /*lineWidth*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*canvas_1_binding*/ ctx[8](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let canvas, ctx;
    	let drawing = false;
    	let strokeColor = "#000000";
    	let lineWidth = 3;
    	let brushType = "source-over"; // Default brush type
    	let states = [];
    	let currentStateIndex = -1;

    	onMount(() => {
    		ctx = canvas.getContext("2d");

    		// ctx.fillStyle = "clear"; // Initially set the canvas background to white
    		// ctx.fillRect(0, 0, canvas.width, canvas.height);
    		states.push(canvas.toDataURL());

    		currentStateIndex++;
    		canvas.addEventListener("mousedown", startDrawing);
    		canvas.addEventListener("mousemove", draw);
    		canvas.addEventListener("mouseup", stopDrawing);
    		canvas.addEventListener("mouseout", stopDrawing);
    	});

    	function saveState() {
    		while (states.length > currentStateIndex + 1) {
    			states.pop(); // Remove future states when new lines are drawn after undo
    		}

    		states.push(canvas.toDataURL());
    		currentStateIndex++;
    	}

    	function undo() {
    		if (currentStateIndex > 0) {
    			currentStateIndex--;
    			let img = new Image();

    			img.onload = () => {
    				ctx.clearRect(0, 0, canvas.width, canvas.height);
    				ctx.drawImage(img, 0, 0);
    			};

    			img.src = states[currentStateIndex];
    		}
    	}

    	function redo() {
    		if (currentStateIndex < states.length - 1) {
    			currentStateIndex++;
    			let img = new Image();

    			img.onload = () => {
    				ctx.clearRect(0, 0, canvas.width, canvas.height);
    				ctx.drawImage(img, 0, 0);
    			};

    			img.src = states[currentStateIndex];
    		}
    	}

    	function startDrawing(event) {
    		drawing = true;
    		ctx.globalCompositeOperation = brushType;
    		ctx.beginPath();
    		ctx.moveTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    	}

    	function draw(event) {
    		if (!drawing) return;
    		ctx.lineTo(event.clientX - canvas.offsetLeft, event.clientY - canvas.offsetTop);
    		ctx.strokeStyle = strokeColor;
    		ctx.lineWidth = lineWidth;
    		ctx.stroke();
    	}

    	function stopDrawing() {
    		if (drawing) {
    			drawing = false;
    			ctx.closePath();
    			saveState();
    		}
    	}

    	function clearCanvas() {
    		ctx.clearRect(0, 0, canvas.width, canvas.height);

    		// ctx.fillStyle = "clear"; 
    		// ctx.fillRect(0, 0, canvas.width, canvas.height);
    		saveState();
    	}

    	function changeBrush(type) {
    		$$invalidate(3, brushType = type);
    		$$invalidate(1, strokeColor = type === "eraser" ? "white" : "#000000");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	function select_change_handler() {
    		brushType = select_value(this);
    		$$invalidate(3, brushType);
    	}

    	const change_handler = () => changeBrush(brushType);

    	function input0_input_handler() {
    		strokeColor = this.value;
    		$$invalidate(1, strokeColor);
    	}

    	function input1_change_input_handler() {
    		lineWidth = to_number(this.value);
    		$$invalidate(2, lineWidth);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		canvas,
    		ctx,
    		drawing,
    		strokeColor,
    		lineWidth,
    		brushType,
    		states,
    		currentStateIndex,
    		saveState,
    		undo,
    		redo,
    		startDrawing,
    		draw,
    		stopDrawing,
    		clearCanvas,
    		changeBrush
    	});

    	$$self.$inject_state = $$props => {
    		if ('canvas' in $$props) $$invalidate(0, canvas = $$props.canvas);
    		if ('ctx' in $$props) ctx = $$props.ctx;
    		if ('drawing' in $$props) drawing = $$props.drawing;
    		if ('strokeColor' in $$props) $$invalidate(1, strokeColor = $$props.strokeColor);
    		if ('lineWidth' in $$props) $$invalidate(2, lineWidth = $$props.lineWidth);
    		if ('brushType' in $$props) $$invalidate(3, brushType = $$props.brushType);
    		if ('states' in $$props) states = $$props.states;
    		if ('currentStateIndex' in $$props) currentStateIndex = $$props.currentStateIndex;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		canvas,
    		strokeColor,
    		lineWidth,
    		brushType,
    		undo,
    		redo,
    		clearCanvas,
    		changeBrush,
    		canvas_1_binding,
    		select_change_handler,
    		change_handler,
    		input0_input_handler,
    		input1_change_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
