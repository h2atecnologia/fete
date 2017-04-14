(function() {
'use strict';

const genId = () => {
		return (Math.random()+"").substring(2);
	},
	restoreEntities = (html) => {
		return html.replace(/&gt;/g,">").replace(/&lt;/g,"<");
	},
	toBoolean = (value) => {
		const lookup = {
			true: true,
			false: false,
			yes: true,
			no: false,
			"1": true,
			"0": false,
			y: true,
			n: false
		}
		return lookup[value];
	},
	parser = `function(tag,$={},model={}) {
		function parse() {
			with(model) {
				try { return tag__source__; }
				catch(e) { 
					if(e instanceof ReferenceError) {
						var key = e.message.trim().replace(/'/g,'').split(' ')[0];
						model[key] = (typeof(value)!=='undefined' ? value : '');
						return parse();
					} else throw(e);
				}
			}
		}
		return parse();
	}`,
	activate = (object) => {
		if(typeof(object)!=="object" || !object || object.__views__) return object;
		if(Array.isArray(object)) object.forEach((item,i) => object[i] = activate(item));
		else Object.keys(object).forEach((key) => {
				object[key] = activate(object[key]);
			});
		const viewmap = new Map(),
			proxy = new Proxy(object, {
			get: function(target,property) {
				if(property==="__views__") return viewmap;
				const value = target[property],
					type = typeof(value);
				if(type!=="function") {
					let views = viewmap.get(property);
					if(!views) {
						views = new Set();
						viewmap.set(property,views)
					}
					views.add(viewStack.current);
				}
				return value;
			},
			set: function(target,property,value) {
				target[property] = activate(value);
				const views = viewmap.get(property),
					sviews = [];
				!views || views.forEach((view) => sviews.push(view));
				sviews.forEach((view) => {
					let replaced = false;
					if(view && view.replacement) { 
						view =view.replacement;
						replaced = true;
					}
					if(view && (view.parentElement || view.ownerElement)) {
						replaced || view.use(proxy);
						view.render();
					} else if(!(view instanceof Attr)) views.delete(view); // garbage collect
				});
				return true;
			}
		});
	return proxy;
	},
	router = (event,next) => {
		const target = event.currentTarget,
			controller = target.controller;
		if(controller) {
			const controllertype = typeof(controller),
				model = target.model || {};
			if(controllertype==="function") controller(event,target.model,target.property,target.normalizedValue);
			else if(controllertype==="object") {
				Object.keys(controller).every((key) => {
					let state, 
						rslt = false;
					const test = controller[key].test,
						view = (controller[key].selector ? document.querySelector(controller[key].selector) : target);
					if(event.target.hash) state = event.target.hash.substring(1);
					else if(typeof(test)==="function") rslt = test(event,view,model,state);
					if(rslt || (state && new RegExp(key).test(state))) {
						event.type==="popstate" || rslt || history.pushState({href:target.href,view:target.id},controller[key].title||state);
						if(typeof(controller[key].sideffect)==="function") controller[key].sideffect(event,view,model);
						return controller[key].cascade;
					}
					return true;
				});
			}
		}
		!next || next();
	},
	onchange = (event) => {
		const lazy = event.target.getAttribute("lazy"),
			focused = document.activeElement
		if(["keyup","paste","cut"].includes(event.type) && (lazy==true || lazy==="") && event.target===focused && ![9,13,14].includes(event.keyCode)) return;
		const target = event.target,
			model = target.model,
			property = target.property;
		let value;
		if(model && property) {
			if(target.type==="radio") {
				if(target.checked && model[property]!=target.value) value=target.value;
			} else {
				value = (target.type==="select-multiple" ? [] : ("checkbox"===target.type  ? (target.value = target.checked) : target.value));
				if(target.type==="select-multiple") for(let i=0;target[i];i++) if(target[i].selected) value.push(target[i].value);
			}
			if(["",true,"true"].includes(target.getAttribute("data-two-way")) || fete.options.reactive) {
				model[property] = value;
			}
			target.normalizedValue = value;
		}
		if(target.controller) {
			event.preventDefault();
			event.stopPropagation();
		}
		if(focused) {
			focused.focus();
			typeof(focused.selectionStart)!=="number" || (focused.selectionStart = focused.selectionEnd = focused.value.length);
		}
		router(event);
	};
document.addEventListener("change",onchange);
for(let type of ["keyup","paste","cut"]) document.addEventListener(type,onchange);


function templateCompositeText() {
	let result = [arguments[0][0]];
	for(let i=1;i<arguments.length;i++) {
		if(typeof(arguments[i])!=="undefined") {
			if(Array.isArray(arguments[i])) result.push(arguments[i].join(","));
			else result.push(arguments[i]);
		}
		result.push(arguments[0][i]);
	}
	return result.join("");
}

function templateCompositeObjects() {
	let result = [arguments[0][0]];
	for(let i=1;i<arguments.length;i++) {
		result.push(arguments[i])
		result.push(arguments[0][i]);
	}
	return result;
}

function templateComposite() {
	let result = (!(arguments[0][0] instanceof Node)? (arguments[0][0]!=="" ? [document.createTextNode(arguments[0][0])] : []) : [arguments[0][0]]);
	for(let i=1;i<arguments.length;i++) {
		if(typeof(arguments[i])!=="undefined") {
			if(Array.isArray(arguments[i]) && arguments[i][0] instanceof Node) result = result.concat(arguments[i]);
			else result.push(arguments[i] instanceof Node ? arguments[i] : document.createTextNode(arguments[i]));
		}
		arguments[0][i]==="" || result.push(!(arguments[0][i] instanceof Node) ? document.createTextNode(arguments[0][i]) : arguments[0][i]);
	}
	return result;
}

function include(selector,model) {
	const current = viewStack.current,
		view = document.createElement("include"),
		template = document.querySelector(selector);
	view.innerHTML = template.innerHTML;
	model || (model = current.model);
	view.use(model);
	return view.compile().render();
}

function element(tagName,attributes={},model) {
	const current = viewStack.current,
		view = document.createElement(tagName);
	for(let key in attributes) view[key] = attributes[key];
	model || (model = current.model);
	view.compile();
	return function(modelOrView) {
		if(modelOrView instanceof Node) view.appendChild(modelOrview);
		else if(Array.isArray(modelOrView)) {
			modelOrView.forEach((child) => {
				child instanceof Node || (child = document.createTextNode(child));
				view.appendChild(child);
			});
		} else view.innerText = modelOrView;
		view.use(model);
		return view.render();
	}
}

const imports = {
		include,
		element
	},
	viewStack = [];
Object.defineProperty(viewStack,"current",{set:()=>{},get:() =>  viewStack[viewStack.length-1]});
	
class Fete {
	constructor(options={reactive:true}) {
		const fete = this;
		fete.options = Object.assign({},options);
		
		Object.defineProperty(Node.prototype,"model",{configurable:true,get: function() {
				const model = this.__model__;
				if(!model && this.parentNode) return this.parentNode.model;
				return model;
			},
			set: function(model) {
				this.__model__ = model;
				return true;
			}
		});
		Node.prototype.use = function(object,controller) {
			const model = activate(object);
			this.model = model;
			this.controller = controller;
			return model;
		}
		
		Attr.prototype.compile = function() {
			const start = this.value.indexOf("${");
			if(start>=0) {
				const interpolator = Function("return " + parser.replace("__source__","`"+this.value.trim()+"`"))(),
					owner = this.ownerElement;
				if((this.name==="value" || owner.type==="radio") && start===0) {
					const end = this.value.indexOf("}");
					if(end>=3) {
						const property = this.value.substring(2,end);
						if(property.indexOf(" ")===-1) owner.property = property; // should use a RegExp
					}
				}
				this.interpolator = (model) => {
					!owner.property || !!model[owner.property] || !Object.getOwnPropertyDescriptor(window,owner.property) || Object.defineProperty(model,owner.property,{configurable:true,writable:true,enumerable:true,value:undefined});
					return interpolator(templateCompositeObjects,imports,model);
				}
				if(["foreach","if"].includes(this.name)) {
					this.displayMode = owner.style.display;
					this.innerInterpolator = Function("return " + parser.replace("__source__","`"+restoreEntities(owner.innerHTML)+"`"))();
				}
			}
			return this;
		}
		Attr.prototype.render = function() {
			const model = this.model || {};
			if(this.interpolator) {
				viewStack.push(this);
				const owner = this.ownerElement;
				let value = this.interpolator(model);
				if(this.name==="if"  && !owner.getAttribute("foreach")) {
					while(owner.childNodes.length) owner.removeChild(owner.childNodes[0]);
					if(!value || !value[1]) {
						owner.style.display = "none";
						return;
					} else {
						owner.style.display = this.displayMode;
						let imported = Object.assign({},imports);
						imported.this = model;
						const html = this.innerInterpolator(templateCompositeText,imported,model),
						span = document.createElement("span");
						span.innerHTML = html;
						while(span.childNodes.length>0) owner.appendChild(span.childNodes[0]);
					}
				} else if(this.name==="foreach") {
					while(owner.childNodes.length) owner.removeChild(owner.childNodes[0]);
					if(!value) return;
					if(owner.getAttribute("if")) {
						for(let i=0;i<owner.attributes.length;i++) {
							const attribute = owner.attributes[i];
							if(attribute.name==="if") {
								const value = attribute.interpolator(model);
								if(!value || !value[1]) {
									owner.style.display = "none";
									return;
								} else {
									owner.style.display = this.displayMode;
								}
							}
						}
					}
					value = value[1]; // 0 will = ""
					let imported = Object.assign({},imports);
					imported.this = value;
					if(Array.isArray(value)) {
						value.forEach((item,i) => {
							imported.key = i;
							const html = this.innerInterpolator(templateCompositeText,imported,item),
								span = document.createElement("span");
							span.innerHTML = html;
							while(span.childNodes.length>0) owner.appendChild(span.childNodes[0]);
						});
					} else {
						Object.keys(value).forEach((key) => {
							imported.key = key;
							const html = this.innerInterpolator(templateCompositeText,imported,value[key]),
								span = document.createElement("span");
							span.innerHTML = html;
							while(span.childNodes.length>0) owner.appendChild(span.childNodes[0]);
						});
					}
				} else {
					value = value.filter(item => typeof(item)!=="undefined").map(item => (Array.isArray(item) ? item.join(",") : item)).join("");
					if(this.name==="checked" && owner.type==="radio") {
						 if(owner.value==value) owner.checked || (owner.checked=true); 
					} else if(owner.type==="checkbox" && this.name==="value")  {
						if(owner.value!=value) {
							owner.value = value;
							owner.checked = toBoolean(value);
						}
					} else if(owner.type && owner.type.indexOf("select")===0 && this.name==="value") {
						const values = (Array.isArray(value) ? value : value.split(","));
						for(let i=0;values.length>0 && owner[i];i++) {
							if(values.includes(owner[i].value)) owner[i].selected || (owner[i].selected = true);
							else owner[i].selected = false;
						}
					} else {
						owner[this.name]==value || (owner[this.name] = value);
					}
				}
				viewStack.pop();
			}
			return this;
		}
		Object.defineProperty(Attr.prototype,"model",{configurable:true,get: function() {
				const model = this.__model__;
				return model || this.ownerElement.model;
			},
			set: function(model) {
				this.__model__ = model;
				return true;
			}
		});
		
		Text.prototype.compile = function() {
			if(this.textContent.indexOf("${")>=0) {
				const interpolator = new Function("return " + parser.replace("__source__","`"+this.textContent+"`"))();
				this.interpolator = (model) => interpolator(templateComposite,imports,model);
			}
			return this;
		}
		Text.prototype.render = function() {
			const model = this.model || {};
			if(this.interpolator) {
				viewStack.push(this);
				const content = this.interpolator(model),
					parent = this.parentElement,
					removals = [];
				for(let i=0;i<parent.childNodes.length;i++) {
					const child = parent.childNodes[i];
					if(child.interpolator===this.interpolator) removals.push(child);
				}
				this.replacement = null;
				for(let node of content) {
					if(!this.replacement) {
						this.replacement=node;
						node.render = this.render;
						node.use(model);
					}
					node.interpolator = this.interpolator; // used as a identifier for removal
					parent.insertBefore(node,this);
				}
				for(let removal of removals) parent.removeChild(removal);
				viewStack.pop();
			}
			return this;
		}
		
		HTMLElement.prototype.compile = function(twoway) {
			for(let i=0;i<this.attributes.length;i++) {
				const attribute = this.attributes[i];
				attribute.compile();
			}
			for(let i=0;i<this.childNodes.length;i++) {
				const child = this.childNodes[i];
				if(child instanceof HTMLInputElement && twoway) {
					child.setAttribute("data-two-way",true);
				}
				child.compile(twoway);
			}
			return this;
		}
		HTMLElement.prototype.render = function() {
			viewStack.push(this);
			if(this.getAttribute("bind")) {
				for(let i=0;i<this.attributes.length;i++) {
					const attribute = this.attributes[i];
					if(attribute.name==="bind" && attribute.interpolator) {
						const model = this.model || {},
							value = attribute.interpolator(model);
						if(value && value[1]) this.use(value[1]);
						break;
					}
				}
			}
			for(let i=0;i<this.attributes.length;i++) {
				const attribute = this.attributes[i];
				attribute.render();
			}
			const children = []; // childNodes may change along the way, so solidify
			for(let i=0;i<this.childNodes.length;i++) children.push(this.childNodes[i]);
			for(let child of children) child.render();
			viewStack.pop();
			return this;
		}
	}
	activate(object) {
		return activate(object);
	}
	mvc(model,view,controller,options={reactive:true}) {
		view instanceof HTMLElement || (view=document.querySelector(view));
		if(!view) { throw new Error("Fete.mvc: 'view' undefined"); }
		let template = options.template;
		if(template) {
			template instanceof HTMLElement || (template=document.querySelector(template));
			if(!template) { throw new Error("Fete.mvc: 'options.template' not found " + options.template); }
			view.innerHTML = template.innerHTML;
			let viewsource = restoreEntities(view.innerHTML),
				templatesource = restoreEntities(template.innerHTML);
			if(viewsource !== templatesource) {
				console.log("Template as string ",templatesource);
				console.log("Template as HTML ",viewsource);
				throw new Error("Fete.mvc: Unable to compile. Template may contain invalid HTML.");
			}
			// above happens when template has illegal HTML which may still process correctly in Fete,
			// e.g. <table>${...some functions}</table>; hence, can't be compiled normally.
		}
	  	model = view.compile(options.reactive).use(model,controller);
	  	view.render();
	  	view.addEventListener("click", this.route, false);
	  	return model;
	}
	route(event) {
		return router(event);
	}
}

if(typeof(exports)==="object") {
	module.exports = Fete;
} else if(typeof(window)==="object") {
	window.Fete = Fete;
} else {
	this.Fete = Fete;
}

}).call(this);