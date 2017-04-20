(function() {
'use strict'

const genId = () => (Math.random()+"").substring(2),
	restoreEntities = html => html.replace(/&gt;/g,">").replace(/&lt;/g,"<"),
	toBoolean = value => {
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
		function parse($,model) {
			with(model) {
				try { return tag_src_; }
				catch(e) { 
					if(e instanceof ReferenceError) {
						var key = e.message.trim().replace(/'/g,'').split(' ')[0];
						model[key] = (typeof(value)!=='undefined' ? value : '');
						return parse($,model);
					} else throw(e);
				}
			}
		}
		return parse($,model);
	}`,
	activate = object => {
		if(typeof(object)!=="object" || !object || object.__views__) return object;
		if(Array.isArray(object)) object.forEach((item,i) => object[i] = activate(item));
		else Object.keys(object).forEach(key => object[key] = activate(object[key]));
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
					views.add(CURRENTVIEW);
				}
				return value;
			},
			set: function(target,property,value) {
				target[property] = activate(value);
				const views = viewmap.get(property),
					sviews = [];
				!views || views.forEach(view => sviews.push(view));
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
				Object.keys(controller).every(key => {
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
	onchange = event => {
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
			if(["",true,"true"].includes(target.getAttribute("data-two-way")) || fete.options.reactive) model[property] = value;
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

function templateAsValue() {
	let result = [];
	arguments[0][0]==="" || result.push(arguments[0][0]);
	for(let i=1;i<arguments.length;i++) {
		result.push(arguments[i]);
		arguments[0][i]==="" || result.push(arguments[0][i]);
	}
	return (result.length===1 ? result[0] : result);
}
function templateAsText() {
	let result = [arguments[0][0]];
	for(let i=1;i<arguments.length;i++) {
		result.push(arguments[i]);
		result.push(arguments[0][i]);
	}
	return result.join("");
}

function include(selector,model) {
	const view = document.createElement("include"),
		template = document.querySelector(selector);
	view.innerHTML = template.innerHTML;
	model || (model = CURRENTVIEW.model);
	view.use(model);
	return view.compile().render();
}

function element(tagName,attributes={},model) {
	const view = document.createElement(tagName);
	for(let key in attributes) view[key] = attributes[key];
	model || (model = CURRENTVIEW.model);
	view.compile();
	return function(modelOrView) {
		if(modelOrView instanceof Node) view.appendChild(modelOrview);
		else if(Array.isArray(modelOrView)) {
			modelOrView.forEach(child => {
				child instanceof Node || (child = document.createTextNode(child));
				view.appendChild(child);
			});
		} else view.innerText = modelOrView;
		view.use(model);
		return view.render();
	}
}

let CURRENTVIEW;

const IMPORTS = {
		include,
		element
	},
	RENDERERS = new Map();
	
class Fete {
	constructor(options={reactive:true}) {
		const fete = this;
		fete.options = Object.assign({},options);
		
		Object.defineProperty(Node.prototype,"model",{configurable:true,get: function() {
				const model = this.__model__;
				if(!model && this.parentNode) return this.parentNode.model;
				if(!model && this.ownerElement) return this.ownerElement.model;
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
		Node.prototype.render = function(imports) {
			const renderer = RENDERERS.get(this.id);
			if(renderer) return renderer.call(this,imports);
			return this;
		}
	
		Attr.prototype.compile = function() {
			const start = this.value.indexOf("$");
			if(start>=0) {
				const interpolate = Function("return " + parser.replace("_src_","`"+this.value.trim()+"`"))(),
					render = function(imports) {
						const current = CURRENTVIEW; 
						const owner = CURRENTVIEW = this.ownerElement,
							value = interpolate(templateAsValue,(imports ? Object.assign(imports,IMPORTS) : IMPORTS),this.model);
						//!Array.isArray(value) || (value = value.filter(item => typeof(item)!=="undefined"));
						if(start===0) {
							const end = this.value.lastIndexOf("}");
							if(end>=3) {
								const property = this.value.substring(2,end);
								if(property.indexOf(" ")===-1) owner.property = property; // should use a RegExp
							}
						}
						if(this.name==="bind") owner.use(value);
						else if(this.name==="checked" && owner.type==="radio") {
							 if(owner.value==value) owner.checked || (owner.checked=true); 
						} else if(owner.type==="checkbox" && this.name==="value")  {
							if(owner.value!=value) {
								owner.value = value;
								owner.checked = toBoolean(value);
							}
						} else if(owner.type && owner.type.indexOf("select")===0 && this.name==="value") {
							const values = (Array.isArray(value) ? value : [value]);
							for(let i=0;values.length>0 && owner[i];i++) {
								if(values.includes(owner[i].value)) owner[i].selected || (owner[i].selected = true);
								else owner[i].selected = false;
							}
						} else {
							owner[this.name]==value || (owner[this.name] = value);
							if(!["if","foreach"].includes(this.name)) this.value=value;
						}
						CURRENTVIEW = current;
						return this;
					};
				this.id || (this.id = genId());
				RENDERERS.set(this.id,render);
				this.ownerElement.interpolatedAttributes || (this.ownerElement.interpolatedAttributes = {});
				this.ownerElement.interpolatedAttributes[this.name] || (this.ownerElement.interpolatedAttributes[this.name] = {});
				this.ownerElement.interpolatedAttributes[this.name].attribute = this;
				if(["if","foreach"].includes(this.name)) {
					const children = this.ownerElement.interpolatedAttributes[this.name].children = [];
					for(let i=0;i<this.ownerElement.childNodes.length;i++) {
						const child = this.ownerElement.childNodes[i];
						children.push(child.compile());
					}
					//this.ownerElement.style.display = "none";
				}
			}
			return this;
		}
		Text.prototype.compile = function() {
			if(this.textContent.indexOf("$")>=0) {
				const replacement = document.createElement("interpolation"),
					interpolate = Function("return " + parser.replace("_src_","`"+this.textContent.trim()+"`"))();
				const render = function(imports) {
						const current = CURRENTVIEW; 
						CURRENTVIEW = this;
						replacement.innerHTML = "";
						const result = interpolate(templateAsValue,(imports ? Object.assign({},IMPORTS,imports) : IMPORTS),this.model);
						if(result instanceof Node) replacement.appendChild(result);
						else if(Array.isArray(result)) {
							for(let i=0;i<result.length;i++) {
								const value = result[i];
								if(value instanceof Node) replacement.appendChild(value);
								else replacement.appendChild(document.createTextNode(value));
							}
						} else replacement.innerHTML = result;
						CURRENTVIEW = current;
						return replacement;
					};
				replacement.render = render;
				this.parentElement.replaceChild(replacement,this);
				return replacement;
			}
			return this;
		}
		HTMLElement.prototype.compile = function(twoway) {
			if(this.outerHTML.indexOf("${")>=0) {
				for(let i=0;i<this.attributes.length;i++) {
					const attribute = this.attributes[i];
					attribute.compile();
				}
				for(let i=0;i<this.childNodes.length;i++) {
					const child = this.childNodes[i];
					if(child instanceof Text) {
						const txt = child.textContent;
						if(txt.length===0) {
							this.removeChild(child);
							i--;
							continue;
						}
						if(txt.trim().length===0) this.replaceChild(document.createTextNode(" "),child);
					} else if(child instanceof HTMLInputElement && twoway) child.setAttribute("data-two-way",true);
					this.childNodes[i].compile();
				}
			}
			return this;
		}
		HTMLElement.prototype.render = function(imports) {
			const current = CURRENTVIEW; 
			CURRENTVIEW = this;
			for(let i=0;i<this.attributes.length;i++) this.attributes[i].render(imports);
			if(this.interpolatedAttributes) {
				const attributes = this.interpolatedAttributes;
				if(attributes.if) {
					if(!this.if) {
						this.innerHTML = "";
						CURRENTVIEW = current;
						return;
					}
					if(!attributes.foreach) {
						const iff = attributes.if,
							children = iff.children;
						this.innerHTML = "";
						for(let j=0;j<children.length;j++) {
							const child = children[j];
							child.use(value);
							this.appendChild(child.render({this:target,key:i}).cloneNode(true))
						}
						CURRENTVIEW = current;
						return this;
					}
				}
				if(this.foreach) {
					const foreach = attributes.foreach,
						children = foreach.children;
					let target = this.foreach;
					this.innerHTML = "";
					if(!Array.isArray(target)) {
						const object = target;
						target = [];
						for(let key in object) target.push(object[key]);
					}
					for(let i=0;i<target.length;i++) {
						const value = target[i];
						for(let j=0;j<children.length;j++) {
							const child = children[j];
							child.use(value);
							this.appendChild(child.render({this:target,key:i}).cloneNode(true))
						}
					}
					CURRENTVIEW = current;
					return this;
				}
			} 
			const children = [];
			for(let i=0;i<this.children.length;i++) children.push(this.children[i]);
			for(let i=0;i<children.length;i++) children[i].render(imports);
			CURRENTVIEW = current;
			return this;
		}
	}
	activate(object) {
		return activate(object);
	}
	createComponent(name,html,controller,options={reactive:true}) {
		const fete = this,
			componentTemplate = `class _nm_ extends e {
				constructor(m) {
					const args = [].slice.call(arguments,1);
					super(...arguments);
					this.model = m;
					this.html = html;
					this.controller = ctrlr;
				}
				render(v,m,c) {
					o = Object.assign({},o);
					o.html = this.html;
					return f.mvc(this.model||this,v,this.controller,o);
				}
			}`;
		let extend = options.extend;
		typeof(extend)==="function" || (extend = function() { Object.assign(this,extend||{}); });
		return new Function("f","e","h","ctrlr","o","return " + componentTemplate.replace("_nm_",name))(fete,extend,html,controller,options);
	}
	mvc(model,view,controller,options={reactive:true}) {
		view instanceof HTMLElement || (view=document.querySelector(view));
		if(!view) { throw new Error("Fete.mvc: 'view' undefined"); }
		let innerHTML = options.html,
			template = options.template;
		if(template) {
			template instanceof HTMLElement || (template=document.querySelector(template));
			if(!template) { throw new Error("Fete.mvc: 'options.template' not found " + options.template); }
			innerHTML = template.innerHTML;
		}
		if(innerHTML) {
			view.innerHTML = innerHTML;
			let viewsource = restoreEntities(view.innerHTML),
				templatesource = restoreEntities(innerHTML);
			if(viewsource !== templatesource) console.log("Warning: Template HTML and view HTML mismatch. May contain invalid HTML or HTML fragment outside a div. Rendering may be incorrect.")
		}
	  	model = view.compile(options.reactive).use(model,controller);
	  	//view.render().addEventListener("click", this.route, true);
	  	view.render().onclick = this.route; // the above should work, but does not, addEventListener always results in the currentTarget being document
	  	return model;
	}
	route(event) {
		return router(event);
	}
}

if(typeof(exports)==="object") module.exports = Fete;
else if(typeof(window)==="object") window.Fete = Fete;
else this.Fete = Fete;

}).call(this);