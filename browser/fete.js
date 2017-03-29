//MIT License Copyright (c) 2017 AnyWhichWay, LLC and Simon Y. Blackwell
(function() {
function evalInContext(js, context) {
    //# Return the results of the in-line anonymous function we .call with the passed context
    return function() { return eval(js); }.call(context);
}
let Fete;
(function() {
	"use strict";
	function deepFreeze(object) {
	  !object || typeof(Object)!==object || Object.getOwnPropertyNames(object).forEach((key) => {
	    var value = obj[key];
	    if (value && typeof value === 'object') deepFreeze(value);
	  });
	  return Object.freeze(object);
	}
	function tag(literals, ...substitutions) {
	    const div = document.createElement("interpolation");
	    literals = literals.raw
	    for(var i=0; i < literals.length-1; i++) {
	    	let literal = literals[i];
	    	while(literal.indexOf("  ")==0) literal = literal.substring(1);
	    	literal.length===0 || div.appendChild(document.createTextNode(literals[i]));
	    	let items = substitutions[i];
	    	Array.isArray(items) || (items=[items]);
	    	for(let i=0;i<items.length;i++) {
	        	let item=items[i],
	        		substitution = (item instanceof Node ? item : document.createTextNode(item!==undefined && item!==null ? (i>0 ? "," : "") + item : ""));
	        	div.appendChild(substitution);
	    	}
	    }
	    let literal = literals[i].trimRight();
		while(literal.indexOf("  ")==0) literal = literal.substring(1);
	    literal.length===0 || div.appendChild(document.createTextNode(literals[i]));
	    return div;
	}
	function getContent(view) {
		return (typeof(view)==="object" && view  ? (view instanceof HTMLInputElement ? view.value : (view instanceof HTMLElement ? view.innerHTML : (view instanceof Node ? view.textContent : view))) : view);
	}
	function createInterpolator(template,imports) {
		if(!template || !template.valueOf() || template.valueOf().indexOf("${")===-1) return;
		const body = `(function (interp,tag,imprt) {
			const $ = imprt, $include = imprt.include;
			let values; 
			with(this) { 
				try { values = tag__template__; }
				catch(e) { 
					if(e instanceof ReferenceError) {
						const key = e.message.trim().replace(/'/g,'').split(' ')[0],
						value = this[key];
						this[key] = (typeof(value)!=='undefined' ? value : '');
						return interp.call(this,interp,tag,imprt);
					}
				}
			} 
			return values;
		})`.replace(/__template__/g,"`"+template+"`"),
			interpolator = evalInContext(body,{});
		return function() {
			return interpolator.call(this,interpolator,tag,imports);
		}
	}
	const bindings = new Map(),
		interpolators = new Map(),
		targets = new Map(),
		parents = new Map();

	class F {
		constructor(options={activate:true,reactive:true}) {
			const fete = this;
			this.imports = Object.assign({},options.imports||{});
			this.imports.include = (view,scope) => {
				view instanceof HTMLElement || (view=document.querySelector(view));
				if(view instanceof HTMLTemplateElement) {
					const replacement = document.createElement("include");
					replacement.innerHTML = view.innerHTML.replace(/\s\s+/g, ' ');
					return fete.compile(replacement).use(scope,options.activate,options.reactive);
				}
				return fete.compile(view.cloneNode(true)).use(scope,options.activate,options.reactive);
			};
			this.imports.element = (tagName,data) => { 
				const element = document.createElement(tagName),
					contents = (Array.isArray(data) ? data : [data]);
				for(let item of contents) {
					if(item instanceof Node) {
						element.appendChild(item);
					} else {
						element.appendChild(document.createTextNode(typeof(item)==="string" ? item : JSON.stringify(item)));
					}
				}
				return element;
			}
			Node.prototype.use = function(data,activate,reactive) {
				const me = this;
				!activate || (data=fete.activate(data));
				if(me instanceof HTMLElement) {
					const children = [];
					for(let i=0;i<me.childNodes.length;i++) children.push(me.childNodes[i]);
					for(let child of children)	child.use(data,activate,reactive);
					for(let i=0;i<me.attributes.length;i++) {
						const attribute = me.attributes[i];
						if(attribute.value.indexOf("${")===0 && (me.getAttribute("data-two-way")==="true" || reactive)) {
							me.property = attribute.value.substring(2,attribute.value.lastIndexOf("}")).trim();
							if(data && typeof(data)==="object") {
								data[me.property]!==undefined || (data[me.property]=null);
								bindings.set(me,{object:data,property:me.property});
							}
						}
						attribute.use(data,activate,reactive);
					}
				} else {
					const current = fete.cView,
						target = targets.get(me),
						views = (target ? target.__views__ : undefined);
					fete.cView = me;
					!activate || (data=fete.activate(data));
					if(target && views) views.forEach((oldview) => { oldview!==me || views.delete(oldview); });
					const interpolator = interpolators.get(me.id);
					if(interpolator) {
						const node = interpolator.call(data);
						if(me instanceof Attr && node) me.value = node.childNodes[0].wholeText;
						else if(node) {
							parents.set(me.id,me.parentNode);
							node.id = me.id;
							me.parentNode.replaceChild(node,me);
						}
					}
					fete.cView = current;
				}
				targets.set(me,data);
				return me;
			}
			Object.defineProperty(Node.prototype,"model",{get:function() { return targets.get(this); },set(value) { this.use(value,options.activate,options.reactive); return true; }});
			
			Object.defineProperty(fete,"routeHandler",{writable:true,configurable:true,value:(e) => {
				if(e.target.tagName==="A" && e.target.host===window.location.host && e.target.hash) fete.router(e,(allow) => { if(!allow) { e.preventDefault(); }});
			}});
			Object.defineProperty(fete,"popHandler",{writable:true,configurable:true,value:(event) => {
				if(!event.state) return;
				const parser = document.createElement("a"),
					view = document.getElementById(event.state.view);
				event.retarget = view;
				parser.href = event.state.href;
				for(let key of ["href","origin","host","protocol","hostname","pathname","hash","search"]) event.target[key] = parser[key];
				fete.router(event);
			}});

			function onchange(event) {
				fete.cView = event.target;
				const lazy = event.target.getAttribute("lazy");
				if(["keyup","paste","cut"].includes(event.type) && (lazy==true || lazy==="")) return;
				const value = (event.target.type==="select-multiple" ? [] : (event.target.type==="checkbox"  ? (event.target.value =  event.target.checked) :event.target.value)),
					binding = bindings.get(event.target)
				if(event.target.type==="select-multiple") {
					for(let i=0;event.target[i];i++) if(event.target[i].selected) value.push(event.target[i].value);
				}
				!binding || binding.object[binding.property]===event.target.value || (binding.object[binding.property] = value);
				fete.router(event);
			}
			document.addEventListener("change",onchange);
			for(let type of ["keyup","paste","cut"]) document.addEventListener(type,onchange);

		}
		router(event,next) {
			const target = event.currentTarget, //event.retarget || event.target,
				controller = target.controller;
			if(controller) {
				const controllertype = typeof(controller),
					model = (target.model ? JSON.parse(JSON.stringify(target.model)) : {});
				deepFreeze(model);
				if(controllertype==="function") controller(event,target.model,target.property,target.value);
				else if(controllertype==="object") {
					Object.keys(controller).every((key) => {
						let state, test = controller[key].test, rslt = false;;
						if(event.target.hash) state = event.target.hash.substring(1);
						else if(typeof(test)==="function") rslt = test(event,model);
						if(rslt || (state && new RegExp(key).test(state))) {
							event.type==="popstate" || rslt || history.pushState({href:target.href,view:target.id},controller[key].title||state);
							const view = (controller[key].selector ? document.querySelector(controller[key].selector) : target);
							if(typeof(controller[key].sideffect)==="function") controller[key].sideffect(event,view,model);
							return controller[key].cascade;
						}
						return true;
					});
				}
				event.preventDefault();
				event.stopPropagation();
			}
			!next || next();
		}
		activate(model) {
			if(!model || typeof(model)!=="object" || model.__views__) return model;
			const me = this,
				views = new Map(),
				proxy = new Proxy(model,{
					get: (target,property) => {
						if(property==="__views__") return views;
						if(typeof(target[property])!=="function" && property!==Symbol.unscopables && me.cView) { 
							let reactive = views.get(property);
							reactive || (reactive=new Set());
							reactive.add(me.cView)
							views.set(property,reactive);
						}
						return target[property];
					},
					set: (target,property,value) => {
						//if(target[property]===value) return true;
						target[property] = value;
						if(typeof(target[property])!=="function" && property!==Symbol.unscopables) {
							const focused = document.activeElement,
								reactive = views.get(property);
							!reactive || reactive.forEach((view) => {
								const current = me.cView;
								me.cView = view;
								const interpolator = interpolators.get(view.id);
								if(interpolator) {
									const node = interpolator.call(proxy);
									if(view instanceof Attr && node) {
										view.value = node.childNodes[0].wholeText;
										view.property = property;
									} else if(node) {
										const parent = (view.parentNode ? view.parentNode : parents.get(view.id));
										node.id = view.id;
										for(let i=0;i<parent.childNodes.length;i++) {
											const child = parent.childNodes[i];
											if(child.id===view.id) { parent.insertBefore(node,child); parent.removeChild(child); break; }
										}
									}
								}
								me.cView = current;
							});
							if(focused) {
								const tofocus = document.getElementById(focused.id);
								if(tofocus) {
									tofocus.focus();
									tofocus.selectionStart = tofocus.selectionEnd = tofocus.value.length
								}
							}
						}
						return true;
					}
				});
			Object.keys(model).forEach((key) => {
				const value = model[key];
				if(value && typeof(value)==="object") model[key] = me.activate(value,proxy);
			});
			return proxy;
		}
		bind(model,view,controller,options={reactive:true}) {
			model=this.activate(model);
			view instanceof HTMLElement || (view=document.querySelector(view));
			if(!view) { throw new Error("Fete.bind: 'view' undefined"); }
			let template = options.template;
			if(template) {
				template instanceof HTMLElement || (template=document.querySelector(template));
				if(!template) { throw new Error("Fete.bind: 'options.template' not found " + options.template); }
				view.innerHTML = template.innerHTML;
			}
			this.compile(view);
			if(model) view.use(model,true,options.reactive);
			view.controller = controller;
			view.addEventListener("click", this.routeHandler, false);
			return model;
		}
		compile(view) {
			let me = this,
				fete = this,
				current = fete.cView;
			if(interpolators.get(view.id)) return view;
			fete.cView = me;
			if(view instanceof HTMLElement) {
				const children = [];
				for(let i=0;i<view.childNodes.length;i++) children.push(view.childNodes[i]);
				for(let child of children)	me.compile(child);
				for(let i=0;i<view.attributes.length;i++) me.compile(view.attributes[i]);
			} else if(["string","number","boolean"].includes(typeof(view))) {
				const replacement = {};
				replacement.id = (Math.random()+"").substring(2);
				const interpolator = createInterpolator(getContent(view),me.imports);
				Object.defineProperty(replacement,"use",{value:function(data,activate) {
					const me = this,
						current = fete.cView;
					fete.cView = me;
					!activate || (data=fete.activate(data));
					const target = targets.get(me);
					if(target && target.__views__) target.__views__.forEach((oldview) => { oldview!==me || target.__views__.delete(oldview); })
					targets.set(me,data);
					fete.cView = current;
					return me;
				}});
				Object.defineProperty(replacement,"model",{get:function() { return targets.get(this); },set(value) { this.use(value,options.activate); return true; }})
				Object.defineProperty(replacement,"valueOf",{value:function() { return (interpolator ? (() => { let value = interpolator.call(targets.get(this)); return (value ? value.innerHTML : undefined); })() : targets.get(this))}});
				view = replacement;
			}
			if(!(view instanceof HTMLElement)) { 
				const interpolator = createInterpolator(getContent(view),me.imports); 
				if(interpolator) { 
					view.id || (view.id=(Math.random()+"").substring(2));
					interpolators.set(view.id,interpolator); 
				}
			}
			fete.cView = current;
			return view;
		}
	}
	Fete = F;
	})();
	if(typeof(module)!=="undefined") {
		module.export = Fete;
	} else if(typeof(this)!=="undefined"){
		this.Fete = Fete;
	} else {
		window.Fete = Fete;
	}
	}).call(this);