(function() {
	"use strict"
	let NODE;
	const ACTIVE = new Map();
	class ObjectEvent {
		constructor(config) {
			Object.assign(this,config);
		}
		stopPropogation() {
			this.stop = true;
		}
	}
	const activate = value => {
		if(value && typeof(value)==="object" && !ACTIVE.get(value)) {
			const dependents = {nodes:{},observers:new Map()};
			ACTIVE.set(value,dependents);
			for(let key in value) activateProperty(value,key,activate(value[key]),dependents);
			if(Array.isArray(value)) {
				for(let i=0;i<value.length;i++) {
					value[i] = activate(value[i]);
					activateProperty(value,i,value[i],dependents);
				}
			}
		}
		return value;
	},
	activateProperty = (target,property,value,activated = ACTIVE.get(target)) => {
		 function get() {
				addDependents(this);
				let value =  desc.get.value;
				if(observers.size>0) {
					let phase = "beforeGet",
					event = new ObjectEvent({type:phase,target,property});
					for(let [observer,accept] of observers) { if(accept.includes(phase)) { observer(event); } if(event.stop) return; }
					phase = "get";
					event = new ObjectEvent(event);
					event.type = phase;
					event.value = value;
					for(let [observer,accept] of observers) { if(accept.includes(phase)) { observer(event); } if(event.stop) return; }
					phase = "afterGet";
					value = event.value;
					event = new ObjectEvent(event);
					event.type = phase;
					for(let [observer,accept] of observers) { if(accept.includes(phase)) { setTimeout(() => observer(event)); } }
				}
				return value;
			};
		const addDependents = (scope) => {
				if(NODE) {
					let properties;
					NODE.id || (NODE.id = Math.random());
					NODE.feteDependents || (NODE.feteDependents = new Map());
					properties = NODE.feteDependents.get(scope);
					properties || (NODE.feteDependents.set(scope,properties = {}));
					properties[property] = true;
					activated.nodes[NODE.id] = true;
				}
			};
		let desc = Object.getOwnPropertyDescriptor(target,property);
		const type = (desc ? typeof(desc.value) : "undefined");
		if(type==="function" || (desc && !desc.configurable)) return;
		if(typeof(value)==="undefined" && desc) value = desc.value;
		activated || ACTIVE.set(target,activated={nodes:{},observers:new Set()});
		const olddesc = desc,
			nodes = activated.nodes,
			observers = activated.observers;
		let event = new ObjectEvent({type:"beforeAdd",target,property,value});
		if(!olddesc) {
			for(let [observer,accept] of observers) { if(accept.includes("beforeAdd")) { observer(event); } if(event.stop) return; }
		}
		desc || (desc = {enumerable:true,configurable:true,writable:true});
		addDependents(target);
		if(event.value && type==="target") desc.value = activate(event.value);
		const oldget = desc.get;
		desc.get+""===get+"" || (desc.get = get);
		desc.get.value = (typeof(event.value)!=="undefined" ? event.value : oldget);
		const oldset = desc.set;
		desc.set = function set(value) {
			value = activate(value);
			const oldvalue = desc.get.value,
			oldtype = typeof(oldvalue);
			if(oldvalue!==value || (oldtype==="undefined" && typeof(value)==="undefined")) {
				if(observers.size>0) {
					let phase = "beforeChange",
					event = new ObjectEvent({type:phase,target,property,value});
					for(let [observer,accept] of observers) { if(accept.includes(phase)) { observer(event); } if(event.stop) return; }
					value = event.value;
				}
				for(let id in nodes) {
					const node = document.getElementById(id);
					if(node && (node.parentElement || node.ownerElement)) {
						const properties = node.feteDependents.get(this);
						if(properties && properties[property]) schedule(node);
					} else delete nodes[id];
				}
				if(oldset) oldset(value); 
				else desc.get.value = value;
				if(observers.size>0) {
					let phase = "afterChange";
					event = new ObjectEvent({type:phase,target,property,oldvalue});
					for(let [observer,accept] of observers) { if(accept.includes(phase)) { setTimeout(() => observer(event)) } }
				}
			}
			return true;
		}
		delete desc.writable;
		delete desc.value;
		Object.defineProperty(target,property,desc);
		if(!olddesc) {
			for(let [observer,accept] of activated.observers) { if(accept.includes("afterAdd")) { observer(new ObjectEvent({type:"afterAdd",target,property,value})); } }
		} 
	},
	feteListener = event => {
		const target = event.currentTarget;
		let value = parse(target.value);
		if(target.type==="checkbox") {
			target.setAttribute("value",target.checked);
			if(target.checked) target.setAttribute("checked","");
			else target.removeAttribute("checked");
		} else if(target.type==="select-multiple") {
			const values = [],
				selected = [].slice.call(target.selectedOptions);
			for(let option of selected) values.push(option.value);
			value = values;
		}
		target.feteChanging = true;
		if(target.feteDependents) {
			const attribute = target.getAttributeNode("value");
			if(attribute) {
				target.feteDependents.forEach((properties,object) => {
					for(let property in properties) {
						if(propertyName(attribute.render.template)===property) object[property] = value;
					}
				});
			}
		}
		target.feteChanging = false;
	},
	h = (tagName,attributes={},innerHTML) => {
		const node = document.createElement(tagName);
		for(let attribute in attributes) node.setAttribute(attribute,attributes[attribute]);
		!innerHTML || (node.innerHTML = innerHTML);
		return node;
	},
	parse = value => {
		if(typeof(value)==="string") {
			try {
				value = JSON.parse(value);
			} catch(e) {
				;
			}
		}
		return value;
	},
	parser = (strings,...values) => {
		if(values.length===1 && strings.filter(item => item.length>0).length===0) return values[0];
		let result = "";
		for(let i=0;i<strings.length;i++) result += (strings[i] + (i<values.length ? values[i] : ""));
		return result;
	},
	propertyName = template => {
		if(typeof(template)==="string" && template[template.length-1]==="}" && template.indexOf("${")===0) {
			const property = template.substring(2,template.length-1);
			if(/^(?:[\w]+\.)*\w+$/.test(property)) return property;
		}
	},
	router = (event,next) => {
		const target = event.currentTarget,
			controller = target.controller;
		if(controller) {
			const controllertype = typeof(controller),
				model = target.feteModel || {};
			if(controllertype==="function") controller(event,target.feteModel);
			else if(controllertype==="object") {
				let some;
				if(Object.keys(controller).every(key => {
					let state, 
						rslt = false;
					const test = controller[key].test,
						view = (controller[key].selector ? document.querySelector(controller[key].selector) : target);
					if(event.target.hash) state = event.target.hash.substring(1);
					else if(typeof(test)==="function") rslt = test(event,view,model,state);
					if(rslt || (state && new RegExp(key).test(state))) {
						event.type==="popstate" || rslt || history.pushState({href:target.href,view:target.id},controller[key].title||state);
						if(typeof(controller[key].sideffect)==="function") controller[key].sideffect(event,view,model);
						some = true;
						return controller[key].cascade;
					}
					return true;
				}) && some) {
					event.preventDefault();
					event.stopPropagation();
				};
			}
		}
		!next || next();
	},
	schedule = node => {
		if(!node.feteDirty && !node.feteChanging && node.render) { //!node.feteChanging && 
			node.feteDirty = true;
			setTimeout(() => {
				!node.feteDirty || node.render();
			},10);
		}
	};
	class Component {
		static register(f) {
			Component.extensions[f.name.toUpperCase()] = f;
		}
		constructor(node,properties) {
			Object.assign(this,properties);
			Object.defineProperty(this,"parentElement",{enumerable:false,configurable:true,writable:true,value:node});
			Object.defineProperty(this,"outerHTML",{enumerable:false,configurable:true,writable:true,value:node.innerHTML});
			Object.defineProperty(this,"attributes",{enumerable:false,configurable:true,writable:true,value:{}});
			const attributes = [].slice.call(node.attributes);
			for(let attribute of attributes) attribute.name==="id" || (this.attributes[attribute.name] = parse(attribute.value));
			Object.defineProperty(this,"style",{enumerable:false,configurable:true,writable:true,value: Object.create(CSSStyleDeclaration.prototype)});
			Object.assign(this.style,node.style);
			this.style.toString = function() {
				let string  = "";
				for(let i=0;typeof(this[i])!=="undefined";i++) {
					const parts = this[i].split("-"),
						key = (parts.length===1 ? parts[0] : parts[0]+parts[1][0].toUpperCase()+parts[1].substring(1));
					string += this[i] + ":" + this[key] + ";"
				}
				return string;
			}
			activate(this);
		}
		h(tagName,attributes={},innerHTML) {
			return h(tagName,attributes={},innerHTML);
		}
	}
	Component.extensions = {};
	class Fete {
		constructor() {
			const me = this;
			this.directives = { };
			this.extensions = {
				activateProperty,
				//include,
				parser
			}
			function handleContent(scope,component,model,controller) {
				const span = document.createElement("component"),
					content = component.render(model),
					type = typeof(content);
				if(type==="string") {
					scope.innerHTML = content;
					const children = [].slice.call(scope.childNodes);
					for(let child of children) {
						child.render(model,controller,component);
						child.feteComponent = component;
						if(child.attributes) {
							const attributes = [].slice.call(child.attributes);
							for(let attribute of attributes) {
								const name = attribute.name;
								if(name.indexOf("on")===0) {
									const fname = attribute.value.split("(")[0];
									if(typeof(component[fname])==="function") {
										child.removeAttribute(attribute.name);
										child[name] = component[fname].bind(component);
									}
								}
							}
						}
					}
				} else if(content && type==="object") {
					const items = (Array.isArray(content) ? content : [content]);
					while(scope.lastChild) scope.removeChild(scope.lastChild);
					for(let item of items) {
						item.feteComponent = component;
						item.render(model,controller,component);
						scope.appendChild(item);
					}
				}
			}
			function resolve(template,node) {
				if(template.indexOf("${")>=0) {
					const code = 
`const $ = extns,model=(typeof(node.feteModel)!=="undefined"?node.feteModel:{});
do{try{with(extrs){with(model){return $.parser_tmplt_;}}} 
 catch(e){ if(e instanceof ReferenceError){
  const prpty=e.message.split(" ")[0];
   let prnt=node.parentNode,v;
    while(prnt){
	  if(prnt && prnt.feteModel && typeof(prnt.feteModel)==="object" && prpty in prnt.feteModel){v=prnt[prpty];break;}
	  prnt=prnt.parentNode;
	}
	if(typeof(v)==="undefined") $.activateProperty(model,prpty);
	else extrs[prpty]=v;
  }else throw(e); }
}while(true);`.replace(/_tmplt_/g,"\`"+template+"\`");
					const extrs = {};
					if(node.attributes) {
						const attributes = [].slice.call(node.attributes);
						for(let attribute of attributes) extrs[attribute.name] = (typeof(attribute.data)!=="undefined" ? attribute.data : attribute.value);
					}
					NODE = (node instanceof Text ? node.parentElement : (node instanceof Attr ? node.ownerElement : node)); // perhaps move back to Set of nodes rather than ids
					const value = Function("extns","node","extrs",code).call(this,me.extensions,node,extrs);
					NODE = null;
					return value;
				}
				return template;
			}
			Attr.prototype.render = function(model,controller,component) {
				const desc = Object.getOwnPropertyDescriptor(this,"render");
				if(!desc) {
					this.render = function render() {
						this.feteDirty = false;
						const owner = this.ownerElement;
						let value = parse(resolve.call(component||this,render.template,owner)),
							type = typeof(value);
						if(owner.type==="checkbox" && this.name==="checked") return;
						this.data = value;
						value = (type==="string" ? value : (type==="function" ? value.name : JSON.stringify(value)));
						if(this.name==="value") {
							if(this.ownerElement.type==="select-multiple") Object.defineProperty(this.ownerElement,"value",{enumerable:true,configurable:true,writable:true,value:value});
							else this.ownerElement.value = value;
						} else {
							this.value = value;
						}
					}
					this.render.template = this.value;
					return this.render();
				}
			}
			HTMLElement.prototype.render = function(model,controller,component) {
				this.feteDirty = false;
				model = this.use(model,controller);
				this.addEventListener("change",feteListener);
				let local, foreach;
				if(this.type==="checkbox") {
					const vnode = this.getAttribute("value"),
						cnode = this.getAttribute("checked");
					if(propertyName(cnode) && !propertyName(vnode)) {
						this.setAttribute("value",cnode);
						this.setAttribute("checked","");
					}
				}
				const cnode = this.getAttributeNode("f-on");
				if(cnode) {
					cnode.render(model,controller,component);
					controller = cnode.data;
				}
				const modelnode = this.getAttributeNode("f-model");
				if(modelnode) {
					modelnode.render(model,controller,component);
					model = modelnode.data;
					this.use(model,controller);
				}
				const letnode = this.getAttributeNode("f-let");
				if(letnode) {
					letnode.render(model,controller,component);
					local = letnode.data;
				}
				const ifnode = this.getAttributeNode("f-if");
				if(ifnode) {
					ifnode.render(model,controller,component);
					if(!ifnode.data) return;
				}
				for(let name in me.directives) {
					const attribute = this.getAttributeNode(name);
					!attribute || directives[name](model,this,attribute);
				}
				const attributes = [].slice.call(this.attributes);
				for(let attribute of attributes) {
					const name = attribute.name;
					if(!["f-on","f-model","f-let","f-if"].includes(name) && !me.directives[name]) {
						attribute.render(model,controller,component);
						if(name==="f-foreach") foreach = attribute.data;
					}
				}
				const ctor = Fete.Component.extensions[this.tagName];
				if(ctor) {
					if(!this.feteComponent) {
						this.feteComponent = new ctor(this);
						handleContent(this,this.feteComponent,model,controller);
					}
				}
				!this.feteComponent || (component = this.feteComponent);
				const children = [].slice.call(this.childNodes);
				if(foreach) {
					const desc = Object.getOwnPropertyDescriptor(this,"render");
					if(!desc) {
						this.render = function(model,controller,component) {
							while(this.lastChild) this.removeChild(this.lastChild);
							const isarray = Array.isArray(foreach),
								models = (isarray ? foreach : Object.values(foreach)),
								keys = (isarray ? [] : Object.keys(foreach));
							for(let i=0;i<models.length;i++) {
								const model = {key:(isarray ? i : keys[i]),model:models[i]};
								Object.assign(model,local);
								for(let child of children) {
									const clone = child.cloneNode(true);
									this.appendChild(clone);
									clone.render(model,controller,component);
								}
							}
						}
						this.render(model,controller,component);
					}
				} else {
					Object.assign(model,local);
					for(let child of children) { // if part is a select, then need to ensure options ar eselected when descending, perhaps X.prototype.render (..) ... HTMLElement.proptotype.render.call(x,args);
						if(!(child instanceof Attr)) {
							child.render(model,controller,component);
						}
					}
				}
			}
			HTMLOptionElement.prototype.render = function(model,controller) {
				const parent = this.parentElement,
					values = parse(parent.value),
					value = parse(this.value);
				if(Array.isArray(values) ? values.includes(this.value) : values===value) {
					this.selected = true;
				}
				HTMLElement.prototype.render.call(this,model,controller);
			}
			Node.prototype.use = function(model,controller) {
				if(model) model = this.feteModel = activate(model);
				if(controller) {
					this.feteController = controller;
					const element = (this instanceof Text ? this.parentElement : (this instanceof Attr ? this.ownerElement : this));
					element.addEventListener("click",(event) => controller(event,model));
				}
				return this.feteModel;
			}
			Text.prototype.render = function(model,controller,component) {
				if(this.textContent.indexOf("${")>=0) {
					const desc = Object.getOwnPropertyDescriptor(this,"render");
					if(!desc) {
						this.render = function render(model,controller,component) {
							this.feteDirty = false;
							this.use(model);
							this.textContent = parse(resolve.call(component||{},render.template,this));
						}
						this.render.template = this.textContent;
						return this.render(model,controller,component);
					}
				}
			}
		}
		h(tagName,attributes={},innerHTML) {
			return h(tagName,attributes={},innerHTML);
		}
		observe(target,callback,acceptList=["beforeGet","get","afterGet","beforeChange","afterChange","beforeAdd","afterAdd"]) {
			ACTIVE.get(activate(target)).observers.set(callback,acceptList);
		}
		mvc(model,view,controller,options) {
			this.render(model,view,controller,options);
			return model;
		}
		render(model,view,controller,options) {
			typeof(view)!=="string" || (view = document.querySelector(view));
			return view.render(model,controller);
		}
		unobserve(target,callback) {
			const activated = ACTIVE.get(target);
			!activated || activated.observers.delete(callback);
		}
		static parse(value) {
			return parse(value);
		}
	}
	Fete.Component = Component;
	
	if(typeof(module)!=="undefined") {
		module.exports = Fete;
	}
	
	if(typeof(window)!=="undefined") {
		window.Fete = Fete;
	}

}).call(this);
