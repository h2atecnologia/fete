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
			const dependents = {nodes:{},observers:new Set()};
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
				let event = new ObjectEvent({type:"beforeGet",target,property});
				for(let observer of observers) { observer(event); if(event.stop) return; }
				event = new ObjectEvent(event);
				event.type = "get", event.value = desc.get.value;
				for(let observer of observers) { observer(event); if(event.stop) return; }
				const value = event.value;
				event = new ObjectEvent(event);
				event.type = "afterGet";
				for(let observer of observers) setTimeout(() => observer(event));
				return value;
			};
		const addDependents = (scope) => {
				if(NODE) {
					let properties;
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
			for(let observer of observers) { observer(event); if(event.stop) return; }
		}
		desc || (desc = {enumerable:true,configurable:true,writable:true});
		addDependents(target);
		if(event.value && type==="target") desc.value = activate(event.value);
		const oldget = desc.get;
		desc.get+""===get+"" || (desc.get = get);
		desc.get.value = (typeof(event.value)!=="undefined" ? event.value : oldget);
		const oldset = desc.set;
		desc.set = function(value) {
			value = activate(value);
			const oldvalue = desc.get.value,
			oldtype = typeof(oldvalue);
			if(oldvalue!==value || (oldtype==="undefined" && typeof(value)==="undefined")) {
				let event = new ObjectEvent({type:"beforeChange",target,property,value});
				for(let observer of observers) { observer(event); if(event.stop) return; }
				for(let id in nodes) {
					const node = document.getElementById(id);
					if(node && (node.parentElement || node.ownerElement)) {
						const properties = node.feteDependents.get(this);
						if(properties && properties[property]) schedule(node);
					} else delete nodes[id];
				}
				if(oldset) oldset(event.value); 
				else desc.get.value = event.value;
				for(let observer of observers) setTimeout(() => observer(new ObjectEvent({type:"afterChange",target,property,oldvalue})));
			}
			return true;
		}
		delete desc.writable;
		delete desc.value;
		Object.defineProperty(target,property,desc);
		if(!olddesc) {
			for(let observer of activated.observers) observer(new ObjectEvent({type:"afterAdd",target,property,value}));
		} 
	},
	feteListener = event => {
		const target = event.currentTarget;
		if(target.type==="checkbox") {
			target.setAttribute("value",target.checked);
			if(target.checked) target.setAttribute("checked","");
			else target.removeAttribute("checked");
		} else if(target.type==="select-multiple") {
			const values = [];
			for(let option of target.selectedOptions) values.push(option.value);
			target.setAttribute("value",JSON.stringify(values));
		} else if(target.type==="select-one") target.setAttribute("value",target.value);
		if(target.feteDependents) {
			const attribute = target.getAttributeNode("value");
			if(attribute) {
				target.feteDependents.forEach((properties,object) => {
					for(let property in properties) {
						if(propertyName(attribute.render.template)===property) object[property] = parse(target.value);
					}
				});
			}
		}
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
		if(!node.feteDirty && node.render) { //!node.feteChanging && 
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
		constructor(node) {
			this.parentElement = node;
			this.attributes = {};
			for(let attribute of node.attributes) this.attributes[attribute.name] = parse(attribute.value);
			this.style = Object.create(CSSStyleDeclaration.prototype);
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
			function handleContent(scope,node,model,controller) {
				const content = node.render(model,controller),
					type = typeof(content);
				if(node instanceof Component) {
					while(scope.lastChild) scope.removeChild(scope.lastChild); 
				}
				if(type==="string") {
					const span = document.createElement("span");
					span.innerHTML = resolve.call(node,content,scope);
					for(let child of span.children) {
						const attributes = [].slice.call(child.attributes);
						for(let attribute of attributes) {
							if(attribute.name.indexOf("on")===0) {
								const fname = attribute.value.split("(")[0];
								if(node[fname]+""===attribute.value) {
									child.removeAttribute(attribute.name);
									child[attribute.name] = node[fname];
								}
							}
						}
						scope.appendChild(child);
						child.render(model,controller);
					}
				} else if(content && type==="object") {
					const items = (Array.isArray(content) ? content : [content]);
					for(let item of items) {
						scope.appendChild(item);
						item.render(model,controller);
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
						for(let attribute of node.attributes) extrs[attribute.name] = (typeof(attribute.data)!=="undefined" ? attribute.data : attribute.value);
					}
					NODE = node;
					const value = Function("extns","node","extrs",code).call(this,me.extensions,node,extrs);
					NODE = null;
					return value;
				}
				return template;
			}
			Attr.prototype.render = function() {
				const desc = Object.getOwnPropertyDescriptor(this,"render");
				if(!desc) {
					this.render = function render() {
						this.feteDirty = false;
						const owner = this.ownerElement;
						let value = parse(resolve(render.template,owner));
						if(owner.type==="checkbox" && this.name==="checked") return;
						this.value = (typeof(value)==="string" ? value : JSON.stringify(value));
						this.data = value;
					}
					this.render.template = this.value;
					return this.render();
				}
			}
			HTMLElement.prototype.render = function(model,controller) {
				this.feteDirty = false;
				model = this.use(model,controller);
				this.addEventListener("change",feteListener);
				this.id || (this.id = Math.random());
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
					cnode.render();
					controller = cnode.data;
				}
				const modelnode = this.getAttributeNode("f-model");
				if(modelnode) {
					modelnode.render();
					model = modelnode.data;
					this.use(model,controller);
				}
				const letnode = this.getAttributeNode("f-let");
				if(letnode) {
					letnode.render();
					local = letnode.data;
				}
				const ifnode = this.getAttributeNode("f-if");
				if(ifnode) {
					ifnode.render();
					if(!ifnode.data) return;
				}
				for(let name in me.directives) {
					const attribute = this.getAttributeNode(name);
					!attribute || directives[name](model,this,attribute);
				}
				for(let attribute of this.attributes) {
					const name = attribute.name;
					if(!["f-on","f-model","f-let","f-if"].includes(name) && !me.directives[name]) {
						attribute.render();
						if(name==="f-foreach") foreach = attribute.data;
						else if(name==="value" && this.value!==attribute.value) this.value = attribute.value;
					}
				}
				const ctor = Fete.Component.extensions[this.tagName];
				if(ctor) {
					handleContent(this,new ctor(this),model,controller);
				}
				const children = [].slice.call(this.childNodes);
				if(foreach) {
					const desc = Object.getOwnPropertyDescriptor(this,"render");
					if(!desc) {
						this.render = function(model,controller) {
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
									clone.render(model,controller);
								}
							}
						}
						this.render(model,controller);
					}
				} else {
					const children = [].slice.call(this.childNodes);
					Object.assign(model,local);
					for(let child of children) {
						if(!(child instanceof Attr)) handleContent(this,child,model,controller);
					}
				}
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
			Text.prototype.render = function(model) {
				if(this.textContent.indexOf("${")>=0) {
					const desc = Object.getOwnPropertyDescriptor(this,"render");
					if(!desc) {
						this.render = function render(model) {
							this.feteDirty = false;
							this.use(model);
							this.textContent = parse(resolve(render.template,this));
						}
						this.render.template = this.textContent;
						return this.render(model);
					}
				}
			}
		}
		h(tagName,attributes={},innerHTML) {
			return h(tagName,attributes={},innerHTML);
		}
		observe(target,callback) {
			ACTIVE.get(activate(target)).observers.add(callback);
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
	}
	Fete.Component = Component;
	
	if(typeof(module)!=="undefined") {
		module.exports = Fete;
	}
	
	if(typeof(window)!=="undefined") {
		window.Fete = Fete;
	}

}).call(this);
